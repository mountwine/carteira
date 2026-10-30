import { describe, expect, it } from "vitest";
import type { AnyEntity } from "../src/domain/entities";
import type { Trip } from "../src/domain/models";
import { recordHash, syncOnce } from "../src/data/cloudSync";
import { createDevice, createServer } from "./helpers/cloudFake";

const leo = "u-leo",
  maya = "u-maya";

const trip = (id = "trip-1", owner = leo): Trip => ({
  id,
  name: "Costa Oeste",
  cover: "",
  startDate: "2027-01-20",
  endDate: "2027-02-07",
  currency: "USD",
  pace: "balanced",
  isDemo: false,
  version: 1,
  destinations: [],
  members: [
    {
      userId: owner,
      displayName: "Leo",
      invitationState: "accepted",
      preferences: {},
    },
  ],
});
const note = (
  id: string,
  owner: string,
  title: string,
  updatedAt: string,
  visibility: "trip" | "private" = "trip",
  tripId = "trip-1",
) =>
  ({
    id,
    tripId,
    kind: "note",
    ownerId: owner,
    visibility,
    version: 1,
    updatedAt,
    deleted: false,
    data: { title, date: "2027-01-22", notes: "" },
  }) as AnyEntity;
const titleOf = (d: ReturnType<typeof createDevice>, id: string) =>
  (d.recs.get(id)?.data as { title: string }).title;
const edit = (
  d: ReturnType<typeof createDevice>,
  id: string,
  title: string,
  updatedAt: string,
) => {
  const r = d.recs.get(id)!;
  d.recs.set(id, {
    ...r,
    version: r.version + 1,
    updatedAt,
    data: { ...r.data, title },
  } as AnyEntity);
};

describe("sincronização entre aparelhos", () => {
  it("leva a viagem e os registros de um aparelho para outro da mesma conta", async () => {
    const server = createServer(),
      a = createDevice(),
      b = createDevice();
    a.tripList = [trip()];
    a.recs.set("n1", note("n1", leo, "Hotel", "2027-01-10T10:00:00Z"));
    const out = await syncOnce(leo, server.remote(leo), a);
    expect(out.pushed).toBe(2);
    expect(server.trips.get("trip-1")?.version).toBe(1);
    const into = await syncOnce(leo, server.remote(leo), b);
    expect(into.tripsChanged).toBe(true);
    expect(b.tripList.map((t) => t.id)).toEqual(["trip-1"]);
    expect(titleOf(b, "n1")).toBe("Hotel");
    expect(b.announced).toContain("trip-1");
  });

  it("não repete envio nem recebimento quando nada mudou", async () => {
    const server = createServer(),
      a = createDevice(),
      b = createDevice();
    a.tripList = [trip()];
    a.recs.set("n1", note("n1", leo, "Hotel", "2027-01-10T10:00:00Z"));
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    for (const d of [a, b]) {
      const again = await syncOnce(leo, server.remote(leo), d);
      expect(again).toMatchObject({
        pushed: 0,
        pulled: 0,
        tripsChanged: false,
      });
    }
    expect(server.records.get("n1")?.version).toBe(1);
  });

  it("propaga edição, registro novo e exclusão nos dois sentidos", async () => {
    const server = createServer(),
      a = createDevice(),
      b = createDevice();
    a.tripList = [trip()];
    a.recs.set("n1", note("n1", leo, "Hotel", "2027-01-10T10:00:00Z"));
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    edit(b, "n1", "Hotel Beverly", "2027-01-11T10:00:00Z");
    b.recs.set("n2", note("n2", leo, "Jantar", "2027-01-11T11:00:00Z"));
    await syncOnce(leo, server.remote(leo), b);
    await syncOnce(leo, server.remote(leo), a);
    expect(titleOf(a, "n1")).toBe("Hotel Beverly");
    expect(titleOf(a, "n2")).toBe("Jantar");
    a.recs.set("n2", {
      ...a.recs.get("n2")!,
      deleted: true,
      version: 2,
      updatedAt: "2027-01-12T10:00:00Z",
    } as AnyEntity);
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    expect(b.recs.get("n2")?.deleted).toBe(true);
  });

  it("na edição simultânea vale a mais recente e a outra fica guardada no histórico", async () => {
    const server = createServer(),
      a = createDevice(),
      b = createDevice();
    a.tripList = [trip()];
    a.recs.set("n1", note("n1", leo, "Hotel", "2027-01-10T10:00:00Z"));
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    edit(a, "n1", "Versão do A", "2099-01-01T10:00:00Z");
    edit(b, "n1", "Versão do B", "2099-01-01T11:00:00Z");
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    await syncOnce(leo, server.remote(leo), a);
    expect(titleOf(a, "n1")).toBe("Versão do B");
    expect(titleOf(b, "n1")).toBe("Versão do B");
    const kept = [...a.history, ...b.history].map(
      (h) => (h.previous as AnyEntity).data as { title: string },
    );
    expect(kept.map((d) => d.title)).toContain("Versão do A");
  });

  it("quando o aparelho local é o mais recente, o servidor passa a ter a versão dele", async () => {
    const server = createServer(),
      a = createDevice(),
      b = createDevice();
    a.tripList = [trip()];
    a.recs.set("n1", note("n1", leo, "Hotel", "2027-01-10T10:00:00Z"));
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    edit(b, "n1", "B antigo", "2000-01-01T00:00:00Z");
    edit(a, "n1", "A novo", "2099-01-01T00:00:00Z");
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    await syncOnce(leo, server.remote(leo), b);
    expect((server.records.get("n1")?.data as { title: string }).title).toBe(
      "A novo",
    );
  });

  it("registro privado de uma pessoa não chega à outra; a viagem e o que é compartilhado chegam", async () => {
    const server = createServer(),
      a = createDevice(),
      g = createDevice();
    a.tripList = [trip()];
    a.recs.set("pub", note("pub", leo, "Roteiro", "2027-01-10T10:00:00Z"));
    a.recs.set(
      "sec",
      note("sec", leo, "Passaporte", "2027-01-10T10:00:00Z", "private"),
    );
    await syncOnce(leo, server.remote(leo), a);
    server.join(maya, "trip-1");
    await syncOnce(maya, server.remote(maya), g);
    expect(g.tripList[0].members.map((m) => m.userId)).toEqual([leo, maya]);
    expect(g.recs.has("pub")).toBe(true);
    expect(g.recs.has("sec")).toBe(false);
  });

  it("quem entrou edita e cria; o dono recebe", async () => {
    const server = createServer(),
      a = createDevice(),
      g = createDevice();
    a.tripList = [trip()];
    a.recs.set("pub", note("pub", leo, "Roteiro", "2027-01-10T10:00:00Z"));
    await syncOnce(leo, server.remote(leo), a);
    server.join(maya, "trip-1");
    await syncOnce(maya, server.remote(maya), g);
    edit(g, "pub", "Roteiro da Maya", "2027-01-12T10:00:00Z");
    g.recs.set("m1", note("m1", maya, "Gasto da Maya", "2027-01-12T11:00:00Z"));
    await syncOnce(maya, server.remote(maya), g);
    await syncOnce(leo, server.remote(leo), a);
    expect(titleOf(a, "pub")).toBe("Roteiro da Maya");
    expect(titleOf(a, "m1")).toBe("Gasto da Maya");
    expect(a.tripList[0].members).toHaveLength(2);
  });

  it("não envia registro em nome de outra pessoa", async () => {
    const server = createServer(),
      a = createDevice(),
      g = createDevice();
    a.tripList = [trip()];
    await syncOnce(leo, server.remote(leo), a);
    server.join(maya, "trip-1");
    await syncOnce(maya, server.remote(maya), g);
    g.recs.set("fake", note("fake", leo, "Forjado", "2027-01-12T11:00:00Z"));
    await syncOnce(maya, server.remote(maya), g);
    expect(server.records.has("fake")).toBe(false);
  });

  it("conflito na própria viagem: vale o servidor e a cópia local é guardada", async () => {
    const server = createServer(),
      a = createDevice(),
      b = createDevice();
    a.tripList = [trip()];
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    a.tripList = [{ ...a.tripList[0], name: "Nome do A", version: 2 }];
    b.tripList = [{ ...b.tripList[0], name: "Nome do B", version: 2 }];
    await syncOnce(leo, server.remote(leo), a);
    await syncOnce(leo, server.remote(leo), b);
    expect(b.tripList[0].name).toBe("Nome do A");
    expect(
      b.history.some((h) => (h.previous as Trip).name === "Nome do B"),
    ).toBe(true);
  });

  it("quem saiu da viagem mantém a cópia local e a sincronização continua", async () => {
    const server = createServer(),
      a = createDevice(),
      g = createDevice();
    a.tripList = [trip(), trip("trip-2")];
    await syncOnce(leo, server.remote(leo), a);
    server.join(maya, "trip-1");
    await syncOnce(maya, server.remote(maya), g);
    server.members.get("trip-1")!.delete(maya);
    g.recs.set("x", note("x", maya, "Depois de sair", "2027-01-13T10:00:00Z"));
    await expect(syncOnce(maya, server.remote(maya), g)).resolves.toBeDefined();
    expect(g.tripList.map((t) => t.id)).toContain("trip-1");
    expect(server.records.has("x")).toBe(false);
  });

  it("ignora viagem de demonstração e viagem de outra conta no aparelho", async () => {
    const server = createServer(),
      a = createDevice();
    a.tripList = [{ ...trip("demo"), isDemo: true }, trip("alheia", "u-outro")];
    await syncOnce(leo, server.remote(leo), a);
    expect(server.trips.size).toBe(0);
  });

  it("o resumo do registro ignora versão e data, e muda com o conteúdo", () => {
    const x = note("n", leo, "A", "2027-01-01T00:00:00Z");
    expect(recordHash(x)).toBe(
      recordHash({
        ...x,
        version: 9,
        updatedAt: "2030-01-01T00:00:00Z",
      } as AnyEntity),
    );
    expect(recordHash(x)).not.toBe(
      recordHash({ ...x, data: { ...x.data, title: "B" } } as AnyEntity),
    );
  });
});
