import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import { demoTrip } from "../src/adapters/seed";
import { fullSeed } from "../src/adapters/fullSeed";
import { localTrips, persistTrip } from "../src/adapters/local";
import { all, put } from "../src/data/database";
import type { AnyEntity } from "../src/domain/entities";
import type { Trip } from "../src/domain/models";
import {
  addDestinationWithDates,
  buildEditedTrip,
  destinationScheduleError,
  newDestination,
  newTraveler,
} from "../src/domain/tripEditing";

const user = { id: "editing-owner", name: "Alex", email: "edit@example.test" };
const companion = "editing-companion";
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});
beforeEach(() => storage.clear());
function fixture(): Trip {
  const trip = demoTrip(user);
  const first = { ...trip.destinations[0], id: "destination-one" };
  return {
    ...trip,
    id: "editing-trip",
    version: 4,
    isDemo: false,
    origin: { name: "São Paulo", provider: "manual" },
    destinations: [
      first,
      {
        ...first,
        id: "destination-two",
        transport: ["train"],
        startDate: "2027-01-25",
        timezone: "America/New_York",
      },
    ],
    members: [
      { ...trip.members[0], preferences: { interests: ["art"] } },
      {
        userId: companion,
        displayName: "Alex",
        invitationState: "pending",
        preferences: { pace: "slow" },
      },
    ],
  };
}
const edit = (
  trip: Trip,
  fields: Partial<Trip> = {},
  records: AnyEntity[] = [],
) => buildEditedTrip(trip, user, { ...trip, ...fields }, records);

it("salvar sem mudanças preserva os metadados e não modifica o objeto original", () => {
  const trip = fixture(),
    snapshot = structuredClone(trip);
  expect(edit(trip)).toEqual(snapshot);
  expect(trip).toEqual(snapshot);
});
it("renomeia dois viajantes de nomes iguais sem trocar IDs, preferências ou estado do convite", () => {
  const trip = fixture();
  const next = edit(trip, {
    members: trip.members.map((m, i) => ({
      ...m,
      displayName: i ? "Maya" : "Leonardo",
    })),
  });
  expect(next.members).toEqual([
    { ...trip.members[0], displayName: "Leonardo" },
    { ...trip.members[1], displayName: "Maya" },
  ]);
});
it("reordena nomes duplicados pela identidade e mantém vínculos de atividades, gastos e malas", async () => {
  const trip = fixture();
  const records = fullSeed(trip, user).filter((r) =>
    ["activity", "expense", "bag", "packing"].includes(r.kind),
  );
  for (const r of records) await put("records", r);
  const before = await all<AnyEntity>("records");
  const next = edit(trip, { members: [...trip.members].reverse() }, before);
  expect(next.members.map((m) => m.userId)).toEqual([companion, user.id]);
  expect(await all("records")).toEqual(before);
  for (const r of records) {
    if (r.kind === "activity")
      expect(
        r.data.participants.every((id) =>
          next.members.some((m) => m.userId === id),
        ),
      ).toBe(true);
    if (r.kind === "expense")
      expect(next.members.some((m) => m.userId === r.data.payer)).toBe(true);
    if (r.kind === "bag" || r.kind === "packing")
      expect(next.members.some((m) => m.userId === r.data.traveler)).toBe(true);
  }
});
it("renomeia/reordena destinos da mesma cidade preservando IDs, transportes, datas e fusos", () => {
  const trip = fixture();
  const next = edit(trip, {
    destinations: [
      {
        ...trip.destinations[1],
        city: "Nova York",
        place: { name: "Nova York", provider: "manual" },
      },
      trip.destinations[0],
    ],
  });
  expect(next.destinations[0]).toEqual({
    ...trip.destinations[1],
    city: "Nova York",
    place: { name: "Nova York", provider: "manual" },
  });
  expect(next.destinations[1]).toEqual(trip.destinations[0]);
});
it("mantém subperíodos ao ampliar a viagem e ajusta somente limites fora do novo período", () => {
  const trip = fixture();
  expect(
    edit(trip, { startDate: "2027-01-15", endDate: "2027-02-10" }).destinations,
  ).toEqual(trip.destinations);
  const next = edit(trip, { startDate: "2027-01-24", endDate: "2027-02-01" });
  expect(next.destinations.map((d) => [d.startDate, d.endDate])).toEqual([
    ["2027-01-24", "2027-02-01"],
    ["2027-01-25", "2027-02-01"],
  ]);
  expect(next.destinations.map((d) => d.transport)).toEqual(
    trip.destinations.map((d) => d.transport),
  );
});
it("adiciona homônimos com IDs novos sem reutilizar identidades existentes", () => {
  const trip = fixture(),
    member = newTraveler("Alex"),
    destination = {
      ...newDestination(trip.startDate, trip.endDate),
      city: trip.destinations[0].city,
    };
  const next = edit(trip, {
    members: [...trip.members, member],
    destinations: [...trip.destinations, destination],
  });
  expect(next.members.slice(0, 2)).toEqual(trip.members);
  expect(new Set(next.members.map((m) => m.userId)).size).toBe(3);
  expect(new Set(next.destinations.map((d) => d.id)).size).toBe(3);
  expect(destination.timezone).toBeUndefined();
});
it("remove somente o viajante/destino explicitamente selecionado, sem reassociar nomes iguais", () => {
  const trip = fixture();
  const next = edit(trip, {
    members: [trip.members[0]],
    destinations: [trip.destinations[1]],
  });
  expect(next.members).toEqual([trip.members[0]]);
  expect(next.destinations).toEqual([trip.destinations[1]]);
});
it("não permite remover a conta atual nem trocar a identidade da viagem", () => {
  const trip = fixture();
  expect(() => edit(trip, { members: [trip.members[1]] })).toThrow("Sua conta");
  expect(() => edit(trip, { id: "other" })).toThrow("identificador da viagem");
});
it("rejeita IDs repetidos e nome vazio sem inventar identidades", () => {
  const trip = fixture();
  expect(() =>
    edit(trip, { members: [trip.members[0], trip.members[0]] }),
  ).toThrow("identificadores repetidos");
  expect(() =>
    edit(trip, { destinations: [trip.destinations[0], trip.destinations[0]] }),
  ).toThrow("identificadores repetidos");
  expect(() =>
    edit(trip, {
      members: [trip.members[0], { ...trip.members[1], displayName: " " }],
    }),
  ).toThrow("nome de cada viajante");
});

const linked = (kind: AnyEntity["kind"], field: string): AnyEntity => {
  const record = fullSeed(fixture(), user).find((r) => r.kind === kind)!;
  const array = field === "participants" || field === "split";
  return {
    ...record,
    data: { ...record.data, [field]: array ? [companion] : companion },
  } as AnyEntity;
};
it.each([
  ["activity", "participants"],
  ["expense", "payer"],
  ["expense", "split"],
  ["bag", "traveler"],
  ["packing", "traveler"],
  ["checklist", "assignee"],
] as const)(
  "bloqueia remoção com vínculo %s.%s sem modificar os registros",
  (kind, field) => {
    const trip = fixture(),
      record = linked(kind, field),
      snapshot = structuredClone(record);
    expect(() => edit(trip, { members: [trip.members[0]] }, [record])).toThrow(
      "registros vinculados",
    );
    expect(record).toEqual(snapshot);
  },
);
it("bloqueia remoção de autor de registro privado", () => {
  const checklist = linked("checklist", "assignee");
  if (checklist.kind !== "checklist") throw new Error("Fixture inválida");
  const trip = fixture(),
    record = {
      ...checklist,
      data: { ...checklist.data, assignee: user.id },
      ownerId: companion,
      visibility: "private" as const,
    };
  expect(() => edit(trip, { members: [trip.members[0]] }, [record])).toThrow(
    "registros vinculados",
  );
});
it("não confunde vínculos de outra viagem nem apaga registros arquivados", () => {
  const trip = fixture(),
    record = linked("expense", "payer"),
    archived = { ...record, deleted: true };
  expect(
    edit(trip, { members: [trip.members[0]] }, [
      { ...record, tripId: "other-trip" },
      archived,
    ]).members,
  ).toEqual([trip.members[0]]);
  expect(archived.kind === "expense" && archived.data.payer).toBe(companion);
});
it("reabre offline mantendo identidades, versões, metadados e isolamento entre viagens", async () => {
  const trip = fixture(),
    other = {
      ...trip,
      id: "other-trip",
      members: [newTraveler("Outro", "another-owner")],
    };
  persistTrip(trip);
  persistTrip(other);
  const loaded = (await localTrips(user.id))[0];
  const next = edit(loaded, {
    members: loaded.members.map((m) => ({
      ...m,
      displayName: `${m.displayName} editado`,
    })),
  });
  persistTrip(next);
  vi.stubGlobal("navigator", { onLine: false });
  const reopened = (await localTrips(user.id))[0];
  expect(reopened.members).toEqual(next.members);
  expect(reopened.destinations).toEqual(trip.destinations);
  expect(reopened.version).toBe(loaded.version! + 1);
  expect(await localTrips("another-owner")).toEqual([
    { ...other, version: other.version! + 1 },
  ]);
});
it("edição desatualizada não sobrescreve os dados salvos por outra janela", async () => {
  const trip = fixture();
  persistTrip(trip);
  const a = (await localTrips(user.id))[0],
    b = structuredClone(a);
  persistTrip(edit(a, { name: "Janela A" }));
  const snapshot = storage.get("travel-os:trips:v1");
  expect(() =>
    persistTrip(edit(b, { members: [...b.members].reverse() })),
  ).toThrow("outra janela");
  expect(storage.get("travel-os:trips:v1")).toBe(snapshot);
});

const city = (id: string, startDate: string, endDate: string) => ({
  ...newDestination(startDate, endDate),
  id,
  city: id,
});
it("divide a última cidade ao acrescentar outra e cobre a viagem inteira", () => {
  const next = addDestinationWithDates(
    [city("a", "2027-01-01", "2027-01-10")],
    "2027-01-01",
    "2027-01-10",
  );
  expect(next.map((d) => [d.startDate, d.endDate])).toEqual([
    ["2027-01-01", "2027-01-05"],
    ["2027-01-06", "2027-01-10"],
  ]);
  expect(destinationScheduleError(next, "2027-01-01", "2027-01-10")).toBeNull();
});
it("acrescenta a cidade depois da última quando ainda sobram dias", () => {
  const next = addDestinationWithDates(
    [city("a", "2027-01-01", "2027-01-04")],
    "2027-01-01",
    "2027-01-10",
  );
  expect([next[1].startDate, next[1].endDate]).toEqual([
    "2027-01-05",
    "2027-01-10",
  ]);
});
it("sem datas da viagem, a nova cidade nasce sem datas", () => {
  const next = addDestinationWithDates([newDestination("", "")], "", "");
  expect(next[1]).toMatchObject({ startDate: "", endDate: "" });
});
it("valida chegada/saída, limites e sobreposição, aceitando o dia da troca", () => {
  const range = ["2027-01-01", "2027-01-10"] as const;
  expect(destinationScheduleError([city("a", "", "")], ...range)).toBeNull();
  expect(
    destinationScheduleError(
      [city("a", "2027-01-01", "2027-01-05"), city("b", "", "")],
      ...range,
    ),
  ).toMatch(/Informe/);
  expect(
    destinationScheduleError(
      [
        city("a", "2027-01-06", "2027-01-05"),
        city("b", "2027-01-06", "2027-01-10"),
      ],
      ...range,
    ),
  ).toMatch(/antes da chegada/);
  expect(
    destinationScheduleError(
      [
        city("a", "2026-12-30", "2027-01-05"),
        city("b", "2027-01-05", "2027-01-10"),
      ],
      ...range,
    ),
  ).toMatch(/dentro do período/);
  expect(
    destinationScheduleError(
      [
        city("a", "2027-01-01", "2027-01-06"),
        city("b", "2027-01-05", "2027-01-10"),
      ],
      ...range,
    ),
  ).toMatch(/sobrepor/);
  expect(
    destinationScheduleError(
      [
        city("a", "2027-01-01", "2027-01-05"),
        city("b", "2027-01-05", "2027-01-10"),
      ],
      ...range,
    ),
  ).toBeNull();
});
