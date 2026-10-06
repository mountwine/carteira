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
