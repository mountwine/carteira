import type { Trip, User } from "./models";
export type Visibility = "private" | "trip";
export type Period = "morning" | "afternoon" | "evening";
export interface Activity {
  location?: import("./models").PlaceData;
  needsTime?: boolean;
  title: string;
  date: string;
  time: string;
  period: Period;
  duration: number;
  fixed: boolean;
  placeId: string;
  address: string;
  lat: number | null;
  lng: number | null;
  participants: string[];
  notes: string;
  order: number;
  status: "planned" | "done";
  reservationId: string;
}
export interface Reservation {
  customType?: string;
  location?: import("./models").PlaceData;
  title: string;
  category:
    | "flight"
    | "hotel"
    | "car"
    | "restaurant"
    | "ticket"
    | "tour"
    | "transport"
    | "other";
  date: string;
  endDate: string;
  time: string;
  endTime: string;
  city: string;
  address: string;
  code: string;
  price: number;
  currency: string;
  status: "confirmed" | "pending" | "cancelled";
  notes: string;
  documentId: string;
  addToItinerary: boolean;
}
export interface Expense {
  title: string;
  date: string;
  amount: number;
  currency: string;
  rate: number;
  category: string;
  payer: string;
  split: string[];
  shoppingId: string;
  notes: string;
}
export interface Shopping {
  photoIds?: string[];
  physical?: boolean;
  returnOptOut?: boolean;
  quantity?: number;
  returnPacked?: boolean;
  title: string;
  brand: string;
  image: string;
  price: number;
  targetPrice: number;
  currency: string;
  store: string;
  url: string;
  priority: "low" | "medium" | "high";
  size: string;
  notes: string;
  bought: boolean;
  actualPrice: number;
  bagId: string;
  weight: number;
}
export interface Bag {
  title: string;
  traveler: string;
  type: "backpack" | "cabin" | "checked";
  limit: number;
  actualWeight: number;
}
export interface Packing {
  title: string;
  bagId: string;
  traveler: string;
  category: string;
  weight: number;
  quantity: number;
  packed: boolean;
  returnPacked: boolean;
  shoppingId: string;
}
export interface Checklist {
  title: string;
  phase: "before" | "during" | "return";
  due: string;
  assignee: string;
  done: boolean;
  suggested: boolean;
}
export interface DocumentData {
  customType?: string;
  number?: string;
  issuingCountry?: string;
  issued?: string;
  demoAsset?: string;
  title: string;
  category:
    | "passport"
    | "visa"
    | "insurance"
    | "ticket"
    | "confirmation"
    | "identity"
    | "license"
    | "other";
  expires: string;
  notes: string;
  filePath: string;
  fileName: string;
  mime: string;
  essential: boolean;
  fictitious: boolean;
}
export interface Memory {
  title: string;
  date: string;
  notes: string;
  rating: number;
  placeId: string;
  favorite: boolean;
  photoIds: string[];
}
export interface SavedPlace {
  title: string;
  placeId: string;
  notes: string;
  tags: string[];
  priority: "low" | "medium" | "high";
}
export interface Budget {
  title: string;
  total: number;
  currency: string;
  categories: Record<string, number>;
}
export interface Profile {
  title: string;
  language: string;
  currency: string;
  interests: string[];
  priorities: string;
  shoeSize: string;
  clothesSize: string;
  height: number;
  preferences: string;
  tripPreferences: string;
  theme: "dark" | "light" | "auto";
  notifications: { critical: boolean; useful: boolean; opportunities: boolean };
}
export interface Emergency {
  localNumber?: string;
  consulateName?: string;
  consulatePhone?: string;
  consulateAddress?: string;
  title: string;
  contactName: string;
  contactPhone: string;
  insurance: string;
  policy: string;
  insurancePhone: string;
  medicalNotes: string;
  cardEnglish: string;
}
export interface Day {
  title: string;
  date: string;
  intensity: "light" | "balanced" | "intense";
  notes: string;
}
export interface Note {
  title: string;
  date: string;
  notes: string;
}
export interface Proposal {
  title: string;
  rationale: string;
  changes: Change[];
  status: "pending" | "accepted" | "cancelled";
  createdAt: string;
}
export interface Message {
  title: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  proposalId: string;
}
export interface EntityMap {
  activity: Activity;
  reservation: Reservation;
  expense: Expense;
  shopping: Shopping;
  bag: Bag;
  packing: Packing;
  checklist: Checklist;
  document: DocumentData;
  memory: Memory;
  saved: SavedPlace;
  budget: Budget;
  profile: Profile;
  emergency: Emergency;
  day: Day;
  note: Note;
  proposal: Proposal;
  message: Message;
}
export type Kind = keyof EntityMap;
export interface Entity<K extends Kind = Kind> {
  id: string;
  tripId: string;
  kind: K;
  ownerId: string;
  visibility: Visibility;
  version: number;
  updatedAt: string;
  deleted: boolean;
  data: EntityMap[K];
}
export type AnyEntity = { [K in Kind]: Entity<K> }[Kind];
export interface Change {
  id: string;
  expected: number | null;
  record: AnyEntity;
}
export interface Mutation {
  id: string;
  tripId: string;
  userId: string;
  at: string;
  changes: Change[];
  label: string;
}
export interface Pending {
  mutation: Mutation;
  status: "queued" | "conflict" | "failed";
  error?: string;
}
export class ConflictError extends Error {
  constructor() {
    super(
      "Outra pessoa alterou este item. Sua versão foi preservada para revisão.",
    );
    this.name = "ConflictError";
  }
}
export function ofKind<K extends Kind>(
  records: AnyEntity[],
  kind: K,
): Entity<K>[] {
  return records.filter((r) => r.kind === kind && !r.deleted) as Entity<K>[];
}
export function canRead(record: AnyEntity, userId: string) {
  return record.visibility === "trip" || record.ownerId === userId;
}
export function entity<K extends Kind>(
  kind: K,
  data: EntityMap[K],
  trip: Trip,
  user: User,
  visibility: Visibility = "trip",
): Entity<K> {
  return {
    id: crypto.randomUUID(),
    tripId: trip.id,
    kind,
    ownerId: user.id,
    visibility,
    version: 0,
    updatedAt: new Date().toISOString(),
    deleted: false,
    data,
  };
}
export function edit<K extends Kind>(
  record: Entity<K>,
  data: Partial<EntityMap[K]>,
): Entity<K> {
  return { ...record, data: { ...record.data, ...data } };
}
export function change(record: AnyEntity): Change {
  return { id: record.id, expected: record.version || null, record };
}
export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    value,
  );
}
export function daysOf(trip: Trip) {
  const out: string[] = [];
  for (
    let d = new Date(trip.startDate + "T12:00:00Z");
    d.toISOString().slice(0, 10) <= trip.endDate && out.length < 366;
    d.setUTCDate(d.getUTCDate() + 1)
  )
    out.push(d.toISOString().slice(0, 10));
  return out;
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
}
export const expenseCategories = [
  "Alimentação",
  "Transporte",
  "Hospedagem",
  "Atrações",
  "Compras",
  "Outros",
];
export function validateRecord(r: AnyEntity, trip: Trip) {
  if (!r.data.title.trim() || r.data.title.length > 160)
    throw new Error("Informe um título com até 160 caracteres.");
  const d = r.data as unknown as Record<string, unknown>;
  for (const field of [
    "amount",
    "price",
    "targetPrice",
    "actualPrice",
    "weight",
    "actualWeight",
    "limit",
    "total",
    "duration",
    "rate",
    "quantity",
  ])
    if (field in d && (!Number.isFinite(d[field]) || Number(d[field]) < 0))
      throw new Error(
        "Valores e pesos precisam ser números positivos ou zero.",
      );
  if ("date" in d && d.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.date)))
    throw new Error("Data inválida.");
  if (
    r.kind === "activity" &&
    (r.data.date < trip.startDate || r.data.date > trip.endDate)
  )
    throw new Error("A atividade precisa estar dentro das datas da viagem.");
  if (r.kind === "activity" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.data.time))
    throw new Error("Informe um horário válido para a atividade.");
  if (r.kind === "activity" && r.data.duration <= 0)
    throw new Error("A duração precisa ser maior que zero.");
  if (r.kind === "expense" && (r.data.rate <= 0 || !r.data.payer))
    throw new Error(
      "Informe o pagador e uma taxa de conversão maior que zero.",
    );
  if (
    r.kind === "reservation" &&
    r.data.endDate &&
    r.data.endDate < r.data.date
  )
    throw new Error("A data final não pode ser anterior ao início.");
  if (r.kind === "profile" && r.visibility !== "private")
    throw new Error("Seu perfil é pessoal.");
  if (r.kind === "emergency" && r.visibility !== "private")
    throw new Error("O cartão de emergência é pessoal.");
}
