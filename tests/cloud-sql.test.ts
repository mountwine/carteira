import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const owner = "11111111-1111-4111-8111-111111111111",
  guest = "22222222-2222-4222-8222-222222222222",
  outsider = "33333333-3333-4333-8333-333333333333";
const tripId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let db: PGlite;

async function as(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const trip = (members: unknown[] = [member(owner, "Leo")]) => ({
  id: tripId,
  name: "Costa Oeste",
  members,
});
const member = (userId: string, displayName: string) => ({
  userId,
  displayName,
  invitationState: "accepted",
  preferences: {},
});
async function pushTrip(
  expected: number | null,
  data = trip(),
  deleted = false,
) {
  const r = await db.query<{ r: Record<string, unknown> }>(
    "select public.push_cloud_trip($1,$2,$3,$4) r",
    [tripId, expected, JSON.stringify(data), deleted],
  );
  return r.rows[0].r;
}
const row = (id: string, o: Record<string, unknown> = {}) => ({
  id,
  expected: null,
  kind: "note",
  owner_id: owner,
  visibility: "trip",
  deleted: false,
  data: { title: "Nota" },
  ...o,
});
async function pushRecords(rows: unknown[], trip_ = tripId) {
  const r = await db.query<{ r: Record<string, unknown>[] }>(
    "select public.push_cloud_records($1,$2) r",
    [trip_, JSON.stringify(rows)],
  );
  return r.rows[0].r;
}
async function code() {
  await as(owner);
  const r = await db.query<{ join_code: string }>(
    "select join_code from public.cloud_trips where id=$1",
    [tripId],
  );
  return r.rows[0].join_code;
}
async function join(who: string, c: string, name = "Maya") {
  await as(who);
  const r = await db.query<{ r: Record<string, unknown> }>(
    "select public.join_cloud_trip($1,$2) r",
    [c, name],
  );
  return r.rows[0].r;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  await db.exec(
    readFileSync(
      new URL("../supabase/cloud/001_sync.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.query("insert into auth.users(id) values($1),($2),($3)", [
    owner,
    guest,
    outsider,
  ]);
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe("PostgreSQL real: sincronização e código de viagem", () => {
  it("cria a viagem com código de 6 símbolos sem ambíguos e o dono como participante", async () => {
    await as(owner);
    expect(await pushTrip(null)).toEqual({ ok: true, version: 1 });
    const c = await code();
    expect(c).toMatch(/^[2-79ACDEF]{6}$/);
    const members = await db.query(
      "select role from public.cloud_members where trip_id=$1",
      [tripId],
    );
    expect(members.rows).toEqual([{ role: "owner" }]);
  });

  it("gera só símbolos permitidos em muitos sorteios", async () => {
    await as(owner);
    const r = await db
      .query<{ c: string }>(
        "select public.new_cloud_code() c from generate_series(1,300)",
      )
      .catch(() => null);
    expect(r).toBeNull(); // função interna: sem permissão para o usuário comum
    await db.exec("reset role");
    const all = await db.query<{ c: string }>(
      "select public.new_cloud_code() c from generate_series(1,300)",
    );
    expect(all.rows.every((x) => /^[2-79ACDEF]{6}$/.test(x.c))).toBe(true);
    expect(new Set(all.rows.join("").split("")).size).toBeGreaterThan(8);
  });

  it("recusa escrita direta e acesso de quem não participa", async () => {
    await as(outsider);
    expect(
      (await db.query("select * from public.cloud_trips")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("update public.cloud_trips set data='{}'"),
    ).rejects.toThrow();
    await expect(pushTrip(1)).rejects.toThrow("ACCESS");
    await expect(pushRecords([row(crypto.randomUUID())])).rejects.toThrow(
      "ACCESS",
    );
  });

  it("aplica a versão esperada e devolve o conflito com o estado atual", async () => {
    await as(owner);
    expect(await pushTrip(1, trip([member(owner, "Leonardo")]))).toEqual({
      ok: true,
      version: 2,
    });
    const stale = await pushTrip(1);
    expect(stale).toMatchObject({ ok: false, reason: "conflict", version: 2 });
    expect(
      (stale.data as { members: { displayName: string }[] }).members[0]
        .displayName,
    ).toBe("Leonardo");
    expect(await pushTrip(5)).toMatchObject({ ok: false, reason: "conflict" });
  });

  it("grava registros novos e atualiza com a versão certa", async () => {
    await as(owner);
    const id = crypto.randomUUID();
    expect(await pushRecords([row(id)])).toEqual([
      { id, ok: true, version: 1 },
    ]);
    expect(
      await pushRecords([row(id, { expected: 1, data: { title: "Editada" } })]),
    ).toEqual([{ id, ok: true, version: 2 }]);
    const stale = await pushRecords([row(id, { expected: 1 })]);
    expect(stale[0]).toMatchObject({
      ok: false,
      reason: "conflict",
      version: 2,
    });
    expect(
      await pushRecords([row(crypto.randomUUID(), { expected: 3 })]),
    ).toMatchObject([{ ok: false, reason: "missing" }]);
  });

  it("não aceita registro novo em nome de outra pessoa", async () => {
    await as(owner);
    const r = await pushRecords([
      row(crypto.randomUUID(), { owner_id: guest }),
    ]);
    expect(r[0]).toMatchObject({ ok: false, reason: "access" });
  });

  it("entra pelo código, vira participante e aparece na lista da viagem", async () => {
    const c = await code();
    expect(await join(guest, c.toLowerCase(), "  Maya  ")).toEqual({
      ok: true,
      trip_id: tripId,
    });
    expect(
      (await db.query("select data from public.cloud_trips")).rows,
    ).toHaveLength(1);
    const names = await db.query<{ n: string }>(
      "select m->>'displayName' n from public.cloud_trips, jsonb_array_elements(data->'members') m",
    );
    expect(names.rows.map((x) => x.n).sort()).toEqual(["Leonardo", "Maya"]);
    expect(await join(guest, c)).toEqual({ ok: true, trip_id: tripId });
    const dup = await db.query<{ n: string }>(
      "select count(*)::int n from public.cloud_members where trip_id=$1",
      [tripId],
    );
    expect(dup.rows[0].n).toBe(2);
  });

  it("separa registros privados dos compartilhados entre participantes", async () => {
    await as(owner);
    const secret = crypto.randomUUID(),
      shared = crypto.randomUUID();
    await pushRecords([row(secret, { visibility: "private" }), row(shared)]);
    await as(guest);
    const ids = (
      await db.query<{ id: string }>("select id from public.cloud_records")
    ).rows.map((r) => r.id);
    expect(ids).toContain(shared);
    expect(ids).not.toContain(secret);
    expect(
      (await pushRecords([row(secret, { expected: 1 })]))[0],
    ).toMatchObject({ ok: false, reason: "access" });
    expect(
      await pushRecords([
        row(shared, { expected: 1, data: { title: "Maya mexeu" } }),
      ]),
    ).toMatchObject([{ ok: true, version: 2 }]);
  });

  it("quem não é dono do registro não muda a autoria nem a privacidade dele", async () => {
    await as(guest);
    const id = crypto.randomUUID();
    await pushRecords([row(id, { owner_id: guest })]);
    await as(owner);
    await pushRecords([
      row(id, { expected: 1, visibility: "private", owner_id: owner }),
    ]);
    const kept = await db.query<{
      owner_id: string;
      visibility: string;
      version: number;
    }>(
      "select owner_id, visibility, version from public.cloud_records where id=$1",
      [id],
    );
    expect(kept.rows[0]).toMatchObject({
      owner_id: guest,
      visibility: "trip",
      version: 2,
    });
    await as(guest);
    await pushRecords([
      row(id, { expected: 2, visibility: "private", owner_id: guest }),
    ]);
    await as(owner);
    expect(
      (await db.query("select id from public.cloud_records where id=$1", [id]))
        .rows,
    ).toHaveLength(0);
  });

  it("código errado conta tentativa e bloqueia após 10; código certo também fica bloqueado", async () => {
    const c = await code();
    for (let i = 0; i < 10; i++)
      expect(await join(outsider, "ZZZZZZ")).toEqual({
        ok: false,
        reason: "invalid",
      });
    expect(await join(outsider, "ZZZZZZ")).toEqual({
      ok: false,
      reason: "locked",
    });
    expect(await join(outsider, c)).toEqual({ ok: false, reason: "locked" });
    await as(outsider);
    expect(
      (await db.query("select * from public.cloud_trips")).rows,
    ).toHaveLength(0);
  });

  it("só o dono gera código novo, e o antigo deixa de valer", async () => {
    const old = await code();
    await as(guest);
    await expect(
      db.query("select public.rotate_cloud_code($1)", [tripId]),
    ).rejects.toThrow("ACCESS");
    await as(owner);
    const fresh = (
      await db.query<{ c: string }>("select public.rotate_cloud_code($1) c", [
        tripId,
      ])
    ).rows[0].c;
    expect(fresh).not.toBe(old);
    await db.exec("reset role");
    await db.query(
      "insert into auth.users(id) values('44444444-4444-4444-8444-444444444444')",
    );
    expect(await join("44444444-4444-4444-8444-444444444444", old)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await join("44444444-4444-4444-8444-444444444444", fresh, "Ana"),
    ).toMatchObject({ ok: true });
  });

  it("participante sai da viagem; o dono não pode sair", async () => {
    await as(owner);
    await expect(
      db.query("select public.leave_cloud_trip($1)", [tripId]),
    ).rejects.toThrow("OWNER");
    await as(guest);
    await db.query("select public.leave_cloud_trip($1)", [tripId]);
    expect(
      (await db.query("select * from public.cloud_trips")).rows,
    ).toHaveLength(0);
    await expect(
      pushRecords([row(crypto.randomUUID(), { owner_id: guest })]),
    ).rejects.toThrow("ACCESS");
  });
});
