import "fake-indexeddb/auto";
import { afterAll, it, expect, vi } from "vitest";
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});
vi.stubGlobal("window", {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});
vi.stubGlobal("navigator", { onLine: false });
import { TravelEngine } from "../src/data/engine";
import { demoTrip } from "../src/adapters/seed";
import { entity, change, ofKind } from "../src/domain/entities";
const user = { id: "offline-user", name: "Teste", email: "test@example.test" },
  trip = { ...demoTrip(user), isDemo: false };
const engines: TravelEngine[] = [];
function engine() {
  const e = new TravelEngine(trip, user);
  engines.push(e);
  return e;
}
afterAll(() => engines.forEach((e) => e.dispose()));
it("salva localmente sem rede e preserva duas alterações concorrentes após reabrir", async () => {
  const a = engine(),
    b = engine();
  await Promise.all([a.start(), b.start()]);
  const first = entity(
      "note",
      { title: "Offline 1", date: trip.startDate, notes: "A" },
      trip,
      user,
      "private",
    ),
    second = entity(
      "note",
      { title: "Offline 2", date: trip.startDate, notes: "B" },
      trip,
      user,
      "private",
    );
  await Promise.all([
    a.mutate([change(first)], "Nota A"),
    b.mutate([change(second)], "Nota B"),
  ]);
  await Promise.all([a.sync(), b.sync()]);
  a.dispose();
  b.dispose();
  const restored = engine();
  await restored.start();
  expect(restored.pending).toHaveLength(0);
  expect(ofKind(restored.base, "note")).toHaveLength(2);
});
it("conflito entre janelas locais preserva a edição para revisão e permite reenvio", async () => {
  const a = engine(),
    b = engine();
  await Promise.all([a.start(), b.start()]);
  const r = ofKind(a.records, "note")[0],
    s = ofKind(b.records, "note")[0];
  await Promise.all([
    a.mutate([change({ ...r, data: { ...r.data, notes: "A" } })], "A"),
    b.mutate([change({ ...s, data: { ...s.data, notes: "B" } })], "B"),
  ]);
  await Promise.all([a.sync(), b.sync()]);
  const owner = engines.find((e) =>
    e.pending.some((p) => p.status === "conflict"),
  );
  expect(owner).toBeDefined();
  const conflict = owner!.pending.find((p) => p.status === "conflict")!;
  expect(conflict.mutation.changes[0].record.data.title).toBeTruthy();
  await owner!.resolve(conflict.mutation.id, "retry");
  expect(owner!.pending).toHaveLength(0);
});
