import type { AnyEntity } from "./entities";
import type { Destination, Trip, TripMember, User } from "./models";

export function newDestination(
  startDate: string,
  endDate: string,
): Destination {
  return {
    id: crypto.randomUUID(),
    city: "",
    country: "",
    startDate,
    endDate,
    transport: [],
  };
}

const DAY_MS = 86400000;
const dayIndex = (date: string) => Date.parse(date + "T00:00:00Z") / DAY_MS;
export function shiftDate(date: string, days: number) {
  return new Date((dayIndex(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Cities may share the day of the change; they cannot otherwise overlap. */
export function destinationScheduleError(
  destinations: Destination[],
  tripStart: string,
  tripEnd: string,
): string | null {
  if (destinations.length < 2) return null;
  if (destinations.some((d) => !d.startDate || !d.endDate))
    return "Informe a chegada e a saída de cada cidade.";
  if (destinations.some((d) => d.endDate < d.startDate))
    return "A saída de uma cidade não pode ser antes da chegada.";
  if (destinations.some((d) => d.startDate < tripStart || d.endDate > tripEnd))
    return "Os dias de cada cidade precisam estar dentro do período da viagem.";
  const sorted = [...destinations].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate),
  );
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].startDate < sorted[i - 1].endDate)
      return "As cidades não podem se sobrepor. O dia da troca pode ser o mesmo.";
  return null;
}

/** Adds a city after the others, splitting the last one if it reaches the end of the trip. */
export function addDestinationWithDates(
  destinations: Destination[],
  tripStart: string,
  tripEnd: string,
): Destination[] {
  const fresh = newDestination("", "");
  if (!tripStart || !tripEnd || !destinations.length)
    return [...destinations, fresh];
  const last = destinations.reduce((a, b) =>
    (b.endDate || tripEnd) >= (a.endDate || tripEnd) ? b : a,
  );
  const from = last.startDate || tripStart,
    to = last.endDate || tripEnd;
  if (to >= tripEnd) {
    const mid = shiftDate(
      from,
      Math.floor((dayIndex(to) - dayIndex(from)) / 2),
    );
    return [
      ...destinations.map((d) =>
        d.id === last.id ? { ...d, startDate: from, endDate: mid } : d,
      ),
      {
        ...fresh,
        startDate: mid < to ? shiftDate(mid, 1) : mid,
        endDate: tripEnd,
      },
    ];
  }
  const start = shiftDate(to, 1);
  return [
    ...destinations,
    {
      ...fresh,
      startDate: start <= tripEnd ? start : tripEnd,
      endDate: tripEnd,
    },
  ];
}

export function newTraveler(
  displayName = "",
  userId: string = crypto.randomUUID(),
): TripMember {
  return { userId, displayName, invitationState: "accepted", preferences: {} };
}

function referencesTraveler(record: AnyEntity, userId: string) {
  if (record.deleted) return false;
  if (record.ownerId === userId) return true;
  switch (record.kind) {
    case "activity":
      return record.data.participants.includes(userId);
    case "expense":
      return record.data.payer === userId || record.data.split.includes(userId);
    case "bag":
    case "packing":
      return record.data.traveler === userId;
    case "checklist":
      return record.data.assignee === userId;
    default:
      return false;
  }
}

type TripFields = Pick<
  Trip,
  | "id"
  | "name"
  | "origin"
  | "cover"
  | "coverPosition"
  | "startDate"
  | "endDate"
  | "currency"
  | "destinations"
  | "members"
>;

/** Draft rows retain identities; names are never used to associate stored data. */
export function buildEditedTrip(
  original: Trip | undefined,
  user: User,
  fields: TripFields,
  records: AnyEntity[],
): Trip {
  const members = fields.members.map((member) => ({
    ...member,
    displayName: member.displayName.trim(),
  }));
  if (members.some((m) => !m.displayName))
    throw new Error("Informe o nome de cada viajante ou remova o campo vazio.");
  if (!members.some((m) => m.userId === user.id))
    throw new Error("Sua conta precisa permanecer entre os viajantes.");
  if (new Set(members.map((m) => m.userId)).size !== members.length)
    throw new Error("Existem viajantes com identificadores repetidos.");
  if (
    new Set(fields.destinations.map((d) => d.id)).size !==
    fields.destinations.length
  )
    throw new Error("Existem destinos com identificadores repetidos.");
  if (original && fields.id !== original.id)
    throw new Error("O identificador da viagem não pode mudar.");
  for (const member of original?.members ?? []) {
    if (members.some((m) => m.userId === member.userId)) continue;
    if (
      records.some(
        (r) => r.tripId === fields.id && referencesTraveler(r, member.userId),
      )
    )
      throw new Error(
        `Não é possível remover ${member.displayName}: existem registros vinculados. Seus dados foram preservados.`,
      );
  }
  return {
    ...original,
    ...fields,
    name: fields.name.trim(),
    pace: original?.pace ?? "balanced",
    isDemo: original?.isDemo ?? false,
    members,
    destinations: fields.destinations.map((destination) => ({
      ...destination,
      startDate:
        destination.startDate >= fields.startDate &&
        destination.startDate <= fields.endDate
          ? destination.startDate
          : fields.startDate,
      endDate:
        destination.endDate >= fields.startDate &&
        destination.endDate <= fields.endDate
          ? destination.endDate
          : fields.endDate,
    })),
  };
}
