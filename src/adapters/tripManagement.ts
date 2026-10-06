import { ConflictError } from "../domain/entities";
import type { Trip, User } from "../domain/models";
import { backendClient, isDemo } from "./runtime";
import { demoTrip } from "./seed";
const key = "travel-os:trips:v1";
function localTrips(user?: User | string): Trip[] {
  let trips = JSON.parse(localStorage.getItem(key) ?? "[]") as Trip[];
  const uid = typeof user === "string" ? user : user?.id;
  if (uid) {
    const legacy = JSON.parse(
      localStorage.getItem(`travel-os:demo-trips:v1:${uid}`) ?? "[]",
    ) as Trip[];
    for (const trip of legacy)
      if (!trips.some((t) => t.id === trip.id)) trips.push(trip);
  }
  if (uid) localStorage.setItem(key, JSON.stringify(trips));
  return trips;
}
function saveLocal(trips: Trip[]) {
  localStorage.setItem(key, JSON.stringify(trips));
}
export async function listLocalTrips(userId: string) {
  return localTrips(userId).filter((t) =>
    t.members.some(
      (m) => m.userId === userId && m.invitationState === "accepted",
    ),
  );
}
export async function createLocalDemo(user: User) {
  const trips = localTrips(user);
  const existing = trips.find(
    (t) => t.isDemo && t.members.some((m) => m.userId === user.id),
  );
  if (existing) return existing;
  const trip = demoTrip(user);
  saveLocal([...trips, trip]);
  return localTrips(user).find((t) => t.id === trip.id)!;
}
export async function createTrip(
  user: User,
  input: {
    name: string;
    startDate: string;
    endDate: string;
    city: string;
    timezone: string;
  },
) {
  if (
    !input.name.trim() ||
    !input.city.trim() ||
    input.endDate < input.startDate
  )
    throw new Error("Confira nome, destino e datas.");
  new Intl.DateTimeFormat("pt-BR", { timeZone: input.timezone });
  if (
    (Date.parse(input.endDate) - Date.parse(input.startDate)) / 86400000 >
    365
  )
    throw new Error("Use uma viagem de até 366 dias.");
  if (isDemo) {
    const trip: Trip = {
      id: crypto.randomUUID(),
      name: input.name,
      cover: "",
      startDate: input.startDate,
      endDate: input.endDate,
      currency: "USD",
      pace: "balanced",
      isDemo: false,
      destinations: [
        {
          id: crypto.randomUUID(),
          city: input.city,
          country: "",
          startDate: input.startDate,
          endDate: input.endDate,
          timezone: input.timezone,
          transport: [],
        },
      ],
      members: [
        {
          userId: user.id,
          displayName: user.name,
          invitationState: "accepted",
          preferences: {},
        },
      ],
    };
    saveLocal([...localTrips(user), trip]);
    return trip.id;
  }
  const { data, error } = await backendClient!.rpc("create_manual_trip", {
    trip_name: input.name,
    starts: input.startDate,
    ends: input.endDate,
    city_name: input.city,
    tz: input.timezone,
  });
  if (error) throw error;
  return data as string;
}
export async function createInvite(trip: Trip, user: User) {
  if (isDemo) {
    if (!trip.members.some((m) => m.userId === user.id))
      throw new Error("Sem acesso à viagem.");
    const code = crypto.randomUUID().replaceAll("-", "");
    const invites = JSON.parse(
      localStorage.getItem("travel-os:invites") ?? "{}",
    );
    invites[code] = {
      tripId: trip.id,
      expires: Date.now() + 7 * 86400000,
      used: false,
    };
    localStorage.setItem("travel-os:invites", JSON.stringify(invites));
    return code;
  }
  const { data, error } = await backendClient!.rpc("create_trip_invite", {
    target_trip: trip.id,
  });
  if (error) throw error;
  return data as string;
}
export async function acceptInvite(code: string, user: User) {
  if (!navigator.onLine) throw new Error("Conecte-se para aceitar um convite.");
  if (isDemo) {
    const invites = JSON.parse(
        localStorage.getItem("travel-os:invites") ?? "{}",
      ),
      invite = invites[code];
    if (!invite || invite.expires < Date.now() || invite.used)
      throw new Error("Convite inválido, usado ou expirado.");
    const trips = localTrips(user),
      trip = trips.find((t) => t.id === invite.tripId);
    if (!trip) throw new Error("Viagem não encontrada neste navegador.");
    if (!trip.members.some((m) => m.userId === user.id))
      trip.members.push({
        userId: user.id,
        displayName: user.name,
        invitationState: "accepted",
        preferences: {},
      });
    invite.used = true;
    saveLocal(trips);
    localStorage.setItem("travel-os:invites", JSON.stringify(invites));
    return trip.id;
  }
  const { data, error } = await backendClient!.rpc("accept_trip_invite", {
    invite_code: code,
  });
  if (error) throw error;
  return data as string;
}
export async function updateTrip(trip: Trip, user: User) {
  if (trip.endDate < trip.startDate || !trip.name.trim())
    throw new Error("Confira o nome e as datas.");
  for (const d of trip.destinations) {
    if (
      !d.city.trim() ||
      d.startDate < trip.startDate ||
      d.endDate > trip.endDate ||
      d.endDate < d.startDate
    )
      throw new Error("Destinos devem estar dentro das datas da viagem.");
    new Intl.DateTimeFormat("pt-BR", { timeZone: d.timezone });
  }
  if (isDemo) {
    const trips = localTrips(user);
    const current = trips.find((t) => t.id === trip.id);
    if (!current?.members.some((m) => m.userId === user.id))
      throw new Error("Sem permissão.");
    if ((current.version ?? 1) !== (trip.version ?? 1))
      throw new ConflictError();
    saveLocal(
      trips.map((t) =>
        t.id === trip.id ? { ...trip, version: (t.version ?? 1) + 1 } : t,
      ),
    );
    return;
  }
  const { error } = await backendClient!.rpc("update_trip_details", {
    target_trip: trip.id,
    expected_version: trip.version ?? 1,
    details: {
      name: trip.name,
      cover: trip.cover,
      currency: trip.currency,
      pace: trip.pace,
      start_date: trip.startDate,
      end_date: trip.endDate,
      destinations: trip.destinations,
    },
  });
  if (error) throw error;
}
export const demoTravelers: User[] = [
  { id: "demo-leo", name: "Leo", email: "leo@example.test" },
  { id: "demo-maya", name: "Maya", email: "maya@example.test" },
];
