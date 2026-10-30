import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createCloudRemote } from "../src/adapters/cloudRemote";
import type { AnyEntity } from "../src/domain/entities";
import type { Trip } from "../src/domain/models";

const sql = readFileSync(
  new URL("../supabase/cloud/001_sync.sql", import.meta.url),
  "utf8",
);
/** Parameter names declared for a function in the SQL file. */
function params(fn: string) {
  const head = sql.match(
    new RegExp(`create function public\\.${fn}\\(([^)]*)\\)`, "s"),
  );
  return (head?.[1] ?? "")
    .split(",")
    .map((p) => p.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function fakeClient(
  rows: Record<string, unknown[]> = {},
  rpcResult: unknown | ((name: string) => unknown) = {},
) {
  const calls: { rpc: [string, Record<string, unknown>][]; chain: string[] } = {
    rpc: [],
    chain: [],
  };
  const query = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "gt", "order", "range"])
      q[m] = (...args: unknown[]) => {
        calls.chain.push(`${table}.${m}(${args.join(",")})`);
        return q;
      };
    q.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows[table] ?? [], error: null });
    return q;
  };
  return {
    calls,
    client: {
      from: vi.fn(query),
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        calls.rpc.push([name, args]);
        return {
          data:
            typeof rpcResult === "function"
              ? (rpcResult as (n: string) => unknown)(name)
              : rpcResult,
          error: null,
        };
      }),
    } as never,
  };
}
const trip = { id: "t", name: "x", members: [] } as unknown as Trip;
const note = {
  id: "r1",
  tripId: "t",
  kind: "note",
  ownerId: "u",
  visibility: "trip",
  version: 3,
  updatedAt: "",
  deleted: false,
  data: { title: "a" },
} as unknown as AnyEntity;

describe("ligação com o Supabase", () => {
  it("usa exatamente os nomes de parâmetros das funções do SQL", async () => {
    const { client, calls } = fakeClient({}, (name) =>
      name === "push_cloud_trip" ? { ok: true, version: 2 } : [],
    );
    const remote = createCloudRemote(client);
    await remote.pushTrip("t", 1, trip, false);
    await remote.pushRecords("t", [{ id: "r1", expected: 3, record: note }]);
    const [[tripFn, tripArgs], [recFn, recArgs]] = calls.rpc;
    expect(Object.keys(tripArgs).sort()).toEqual(params(tripFn).sort());
    expect(Object.keys(recArgs).sort()).toEqual(params(recFn).sort());
  });

  it("envia cada registro com as colunas que o SQL lê", async () => {
    const { client, calls } = fakeClient({}, []);
    await createCloudRemote(client).pushRecords("t", [
      { id: "r1", expected: null, record: note },
    ]);
    const rows = calls.rpc[0][1].p_rows as Record<string, unknown>[];
    expect(Object.keys(rows[0]).sort()).toEqual(
      [
        "id",
        "expected",
        "kind",
        "owner_id",
        "visibility",
        "deleted",
        "data",
      ].sort(),
    );
    for (const col of [
      "id",
      "expected",
      "kind",
      "owner_id",
      "visibility",
      "deleted",
      "data",
    ])
      expect(sql).toMatch(new RegExp(`row_in -?>>? '${col}'`));
  });

  it("converte as respostas do servidor, inclusive o conflito", async () => {
    const { client } = fakeClient({}, [
      { id: "r1", ok: true, version: 4 },
      {
        id: "r2",
        ok: false,
        reason: "conflict",
        version: 7,
        data: { a: 1 },
        deleted: false,
        visibility: "trip",
        owner_id: "u",
        updated_at: "2027-01-01T00:00:00Z",
      },
    ]);
    const out = await createCloudRemote(client).pushRecords("t", []);
    expect(out.r1).toEqual({ ok: true, version: 4 });
    expect(out.r2).toMatchObject({
      ok: false,
      reason: "conflict",
      version: 7,
      ownerId: "u",
      updatedAt: "2027-01-01T00:00:00Z",
    });
  });

  it("lê viagens e registros, só os mais novos que o cursor, em ordem", async () => {
    const { client, calls } = fakeClient({
      cloud_trips: [
        {
          id: "t",
          data: trip,
          version: "2",
          deleted: false,
          updated_at: "u",
          join_code: "ABC234",
        },
      ],
      cloud_records: [
        {
          id: "r1",
          trip_id: "t",
          owner_id: "u",
          kind: "note",
          visibility: "trip",
          version: 1,
          deleted: false,
          data: {},
          updated_at: "2027-01-01T00:00:00Z",
        },
      ],
    });
    const remote = createCloudRemote(client);
    expect((await remote.fetchTrips())[0]).toMatchObject({
      id: "t",
      version: 2,
      joinCode: "ABC234",
    });
    const recs = await remote.fetchRecords("t", "2027-01-01T00:00:00Z");
    expect(recs[0]).toMatchObject({ id: "r1", tripId: "t", ownerId: "u" });
    expect(calls.chain.join(" ")).toContain(
      "cloud_records.gt(updated_at,2027-01-01T00:00:00Z)",
    );
    expect(calls.chain.join(" ")).toContain("cloud_records.order(updated_at");
  });

  it("transforma erro do servidor em exceção legível", async () => {
    const client = {
      from: vi.fn(),
      rpc: vi.fn(async () => ({ data: null, error: { message: "ACCESS" } })),
    } as never;
    await expect(
      createCloudRemote(client).pushTrip("t", null, trip, false),
    ).rejects.toThrow("ACCESS");
  });
});
