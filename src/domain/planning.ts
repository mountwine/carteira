import {
  type Entity,
  type Activity,
  type AnyEntity,
  type Change,
  change,
  entity,
  ofKind,
} from "./entities";
import type { Trip, User } from "./models";
export const minutes = (time: string) =>
  time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : 0;
export const clock = (value: number) =>
  `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export function activityMinute(a: Activity) {
  return a.time
    ? minutes(a.time)
    : { morning: 9 * 60, afternoon: 14 * 60, evening: 19 * 60 }[a.period];
}
export function ordered(records: Entity<"activity">[]) {
  return [...records].sort(
    (a, b) =>
      a.data.date.localeCompare(b.data.date) ||
      activityMinute(a.data) - activityMinute(b.data) ||
      a.id.localeCompare(b.id),
  );
}
export function distance(a: [number, number], b: [number, number]) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
    Math.cos(rad(a[0])) *
      Math.cos(rad(b[0])) *
      Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function travelEstimate(a: Activity, b: Activity) {
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null)
    return null;
  const km = distance([a.lat, a.lng], [b.lat, b.lng]) * 1.3;
  return {
    km: Math.round(km * 10) / 10,
    minutes: Math.max(5, Math.ceil((km / 30) * 60)),
    source: "estimate" as const,
  };
}
export function conflicts(activities: Entity<"activity">[]) {
  const items = ordered(activities),
    alerts: { id: string; text: string }[] = [];
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1].data,
      b = items[i].data;
    if (a.time && b.time) {
      const travel = travelEstimate(a, b)?.minutes ?? 0;
      const end = minutes(a.time) + a.duration + travel;
      if (end > minutes(b.time))
        alerts.push({
          id: items[i].id,
          text: `${b.title}: ${end - minutes(b.time)} min de conflito${b.fixed ? " com horário fixo" : ""}${travel ? " incluindo deslocamento estimado" : ""}.`,
        });
    }
  }
  return alerts;
}
export function reservationChanges(
  record: Entity<"reservation">,
  records: AnyEntity[],
  trip: Trip,
  user: User,
): Change[] {
  const existing = ofKind(records, "activity").find(
    (a) => a.data.reservationId === record.id,
  );
  const r = record.data;
  if (record.deleted || !r.addToItinerary || r.status === "cancelled")
    return existing ? [change({ ...existing, deleted: true })] : [];
  const activity: Activity = {
    title: r.title,
    date: r.date,
    time: r.time,
    period: "morning",
    duration:
      r.endTime && r.endDate === r.date
        ? Math.max(15, minutes(r.endTime) - minutes(r.time))
        : 60,
    fixed: Boolean(r.time),
    placeId: "",
    address: r.address,
    lat: null,
    lng: null,
    participants: trip.members
      .filter((m) => m.invitationState === "accepted")
      .map((m) => m.userId),
    notes: `Reserva ${r.code} · ${r.customType || ({ flight: "Voo", hotel: "Hospedagem", restaurant: "Restaurante", ticket: "Ingresso", transport: "Transporte", car: "Transporte", tour: "Atividade", other: "Outros" } as Record<string, string>)[r.category]}`,
    order: r.time ? minutes(r.time) : 540,
    status: "planned",
    reservationId: record.id,
  };
  if (activity.date < trip.startDate || activity.date > trip.endDate)
    throw new Error("Para integrar ao roteiro, use uma data dentro da viagem.");
  return [
    change(
      existing
        ? {
            ...existing,
            data: {
              ...existing.data,
              ...activity,
              placeId: existing.data.placeId,
              lat:
                existing.data.address === activity.address
                  ? existing.data.lat
                  : null,
              lng:
                existing.data.address === activity.address
                  ? existing.data.lng
                  : null,
              status: existing.data.status,
              participants: existing.data.participants,
            },
          }
        : entity("activity", activity, trip, user),
    ),
  ];
}
export function totals(records: AnyEntity[]) {
  return ofKind(records, "expense").reduce(
    (sum, r) => sum + Math.round(r.data.amount * r.data.rate * 100) / 100,
    0,
  );
}
export function balances(records: AnyEntity[]) {
  const result: Record<string, number> = {};
  for (const { data: e } of ofKind(records, "expense")) {
    if (!e.split.length) continue;
    const cents = Math.round(e.amount * e.rate * 100);
    result[e.payer] = (result[e.payer] ?? 0) + cents;
    const each = Math.floor(cents / e.split.length),
      remainder = cents - each * e.split.length;
    e.split.forEach((id, i) => {
      result[id] = (result[id] ?? 0) - each - (i < remainder ? 1 : 0);
    });
  }
  return Object.fromEntries(
    Object.entries(result).map(([id, value]) => [id, value / 100]),
  );
}
export function purchaseChanges(
  shopping: Entity<"shopping">,
  price: number,
  addExpense: boolean,
  currency: string,
  rate: number,
  date: string,
  records: AnyEntity[],
  trip: Trip,
  user: User,
): Change[] {
  if (!Number.isFinite(price) || price < 0)
    throw new Error("Informe um preço real válido.");
  const existing = ofKind(records, "expense").find(
    (e) => e.data.shoppingId === shopping.id,
  );
  const updates: Change[] = [
    change({
      ...shopping,
      data: { ...shopping.data, bought: true, actualPrice: price, currency },
    }),
  ];
  if (addExpense) {
    const expense = {
      title: shopping.data.title,
      date,
      amount: price,
      currency,
      rate,
      category: "Compras",
      payer: user.id,
      split: [],
      shoppingId: shopping.id,
      notes: "Gerado a partir de Compras",
    };
    updates.push(
      change(
        existing
          ? { ...existing, data: expense }
          : entity("expense", expense, trip, user, shopping.visibility),
      ),
    );
  }
  return updates;
}

export function checklistForPhase(
  items: Entity<"checklist">[],
  phase: "before" | "during" | "after",
  daysRemaining: number,
) {
  return items.filter((item) => {
    const stage = item.data.phase;
    if (phase === "after") return false;
    if (!stage) return true;
    if (phase === "before") return stage === "before";
    return stage !== "return" || daysRemaining <= 2;
  });
}
