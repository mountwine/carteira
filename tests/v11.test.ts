import "fake-indexeddb/auto";
import { it, expect, vi, beforeEach } from "vitest";
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});
vi.stubGlobal("navigator", { onLine: true });
vi.stubGlobal("window", { dispatchEvent: vi.fn() });
import {
  checklistForPhase,
  ordered,
  purchaseChanges,
} from "../src/domain/planning";
import {
  validActivity,
  reservationFilter,
  documentFilter,
} from "../src/components/LocalEditors";
import {
  pushNavigation,
  backNavigation,
  screenLabel,
} from "../src/domain/navigation";
import { entity, change, validateRecord, ofKind } from "../src/domain/entities";
import { homeContext } from "../src/domain/models";
import { demoTrip } from "../src/adapters/seed";
import { applyMutation } from "../src/domain/mutations";
import { get, put, all, database } from "../src/data/database";
import {
  localAuth,
  migrateStorage,
  persistTrip,
  localTrips,
  resetPassword,
} from "../src/adapters/local";
import { currentRate } from "../src/adapters/external";
const user = { id: "v11-owner", name: "Local", email: "local@example.test" },
  trip = { ...demoTrip(user), isDemo: false };
const activity = (time: string, date = "2027-01-22") =>
  entity(
    "activity",
    {
      title: "Lugar",
      date,
      time,
      period: "morning",
      duration: 60,
      fixed: false,
      placeId: "",
      address: "Endereço",
      lat: null,
      lng: null,
      participants: [user.id],
      notes: "",
      order: 999,
      status: "planned",
      reservationId: "",
    },
    trip,
    user,
  );
it("ordena por dia e horário mesmo com ordem legada contraditória", () => {
  const a = activity("15:00"),
    b = activity("09:00"),
    c = activity("13:00");
  a.data.order = -100;
  expect(ordered([a, b, c]).map((r) => r.data.time)).toEqual([
    "09:00",
    "13:00",
    "15:00",
  ]);
});
it("horário obrigatório é validado no domínio e no formulário", () => {
  expect(() => validateRecord(activity(""), trip)).toThrow();
  expect(() => validateRecord(activity("25:00"), trip)).toThrow();
  expect(
    validActivity(
      { title: "Passeio", date: "2027-01-22", time: "13:00", address: "LA" },
      trip.startDate,
      trip.endDate,
    ),
  ).toBe(true);
  expect(
    validActivity(
      { title: "", date: "2027-01-22", time: "13:00", address: "LA" },
      trip.startDate,
      trip.endDate,
    ),
  ).toBe(false);
  expect(
    validActivity(
      { title: "Passeio", date: "2027-03-22", time: "13:00", address: "LA" },
      trip.startDate,
      trip.endDate,
    ),
  ).toBe(false);
});
it("calcula automaticamente fases e dia inclusivo da viagem", () => {
  expect(homeContext(trip, new Date("2027-01-19T20:00:00Z")).phase).toBe(
    "before",
  );
  const c = homeContext(trip, new Date("2027-01-22T20:00:00Z"));
  expect(c.phase).toBe("during");
  expect(c.day).toBe(3);
  expect(c.totalDays).toBe(19);
  expect(homeContext(trip, new Date("2027-02-08T20:00:00Z")).phase).toBe(
    "after",
  );
});
it("voltar preserva origem real, foco e posição de scroll", () => {
  const start = [{ id: "home", screen: "Hoje", focus: "", scroll: 0 }];
  const next = pushNavigation(start, "Bagagem", "return", 420);
  expect(screenLabel(next[0].screen)).toBe("Início");
  expect(backNavigation(next)[0].scroll).toBe(420);
  expect(
    backNavigation(
      pushNavigation([{ ...start[0], screen: "Mais" }], "Bagagem"),
    )[0].screen,
  ).toBe("Mais");
});
it("filtros incluem categorias antigas e tipos personalizados", () => {
  expect(reservationFilter("car", "transport")).toBe(true);
  expect(reservationFilter("tour", "ticket")).toBe(true);
  expect(reservationFilter("other", "custom:Ferry", "Ferry")).toBe(true);
  expect(reservationFilter("flight", "hotel")).toBe(false);
  expect(documentFilter("other", "custom:Vacinação", "Vacinação")).toBe(true);
  expect(documentFilter("passport", "visa")).toBe(false);
});
it("storage v2 preserva stores anteriores e adiciona arquivos de mídia/contas", async () => {
  const db = await database();
  expect(db.version).toBe(2);
  for (const name of ["records", "files", "media", "accounts", "settings"])
    expect(db.objectStoreNames.contains(name)).toBe(true);
});
it("migra atividade sem horário sem inventar horário nem apagar o registro", async () => {
  const r = activity("");
  await put("records", r);
  await migrateStorage(user);
  expect((await get<typeof r>("records", r.id))?.data.needsTime).toBe(true);
  expect((await get<typeof r>("records", r.id))?.data.time).toBe("");
  await migrateStorage(user);
  expect(
    (await all<typeof r>("records")).filter((x) => x.id === r.id),
  ).toHaveLength(1);
});
it("viagens e contexto ficam isolados por proprietário e exclusão é arquivada", async () => {
  storage.clear();
  persistTrip(trip);
  expect(await localTrips(user.id)).toHaveLength(1);
  expect(await localTrips("outro")).toHaveLength(0);
  const stored = (await localTrips(user.id))[0];
  persistTrip({ ...stored, deleted: true });
  expect(await localTrips(user.id)).toHaveLength(0);
  expect(storage.get("travel-os:trips:v1")).toContain(trip.id);
});
it("senha local não fica em texto e recuperação real usa chave local", async () => {
  storage.clear();
  const code = await localAuth.signup(
    "Teste",
    "account@example.test",
    "senha-teste-123",
  );
  const account = (await all<Record<string, unknown>>("accounts")).find(
    (a) => (a.user as { email: string }).email === "account@example.test",
  )!;
  expect(JSON.stringify(account)).not.toContain("senha-teste-123");
  await localAuth.logout();
  await expect(
    localAuth.login("account@example.test", "errada"),
  ).rejects.toThrow();
  await localAuth.login("account@example.test", "senha-teste-123");
  expect((await localAuth.current())?.email).toBe("account@example.test");
  await resetPassword("account@example.test", code, "outra-senha-123");
  await localAuth.logout();
  await localAuth.login("account@example.test", "outra-senha-123");
});
it("cotação usa resposta real do adapter e cache offline sem fallback hardcoded", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rate: 0.2, date: "2026-10-05" }),
    }),
  );
  const q = await currentRate("BRL", "USD");
  expect(q.rate).toBe(0.2);
  vi.stubGlobal("navigator", { onLine: false });
  const cached = await currentRate("BRL", "USD");
  expect(cached.rate).toBe(0.2);
  expect(cached.cached).toBe(true);
  await expect(currentRate("JPY", "EUR")).rejects.toThrow(
    "Cotação indisponível",
  );
  vi.stubGlobal("navigator", { onLine: true });
});
it("compra atualiza o mesmo gasto ao mudar o valor efetivo", () => {
  let s = entity(
    "shopping",
    {
      title: "Camisetas",
      brand: "",
      image: "",
      price: 20,
      targetPrice: 0,
      currency: "USD",
      store: "",
      url: "",
      priority: "medium",
      size: "",
      notes: "",
      bought: false,
      actualPrice: 0,
      bagId: "",
      weight: 0,
      quantity: 3,
      physical: true,
    },
    trip,
    user,
  );
  s = { ...s, version: 1 };
  let records = applyMutation(
    [s],
    {
      id: "buy",
      tripId: trip.id,
      userId: user.id,
      at: "",
      label: "",
      changes: purchaseChanges(
        s,
        25,
        true,
        "USD",
        1,
        "2027-01-22",
        [s],
        trip,
        user,
      ),
    },
    user.id,
    true,
  );
  s = ofKind(records, "shopping")[0];
  records = applyMutation(
    records,
    {
      id: "edit",
      tripId: trip.id,
      userId: user.id,
      at: "",
      label: "",
      changes: purchaseChanges(
        s,
        30,
        true,
        "USD",
        1,
        "2027-01-22",
        records,
        trip,
        user,
      ),
    },
    user.id,
    true,
  );
  expect(ofKind(records, "expense")).toHaveLength(1);
  expect(ofKind(records, "expense")[0].data.amount).toBe(30);
});

it("checklist respeita preparação e retorno sem excluir registros", () => {
  const rows = (["before", "during", "return"] as const).map((phase) =>
    entity(
      "checklist",
      {
        title: phase,
        phase,
        due: "",
        assignee: user.id,
        done: false,
        suggested: false,
      },
      trip,
      user,
    ),
  );
  expect(
    checklistForPhase(rows, "before", 100).map((r) => r.data.phase),
  ).toEqual(["before"]);
  expect(checklistForPhase(rows, "during", 5).map((r) => r.data.phase)).toEqual(
    ["before", "during"],
  );
  expect(checklistForPhase(rows, "during", 1)).toHaveLength(3);
  expect(checklistForPhase(rows, "after", 0)).toHaveLength(0);
  expect(rows).toHaveLength(3);
});
