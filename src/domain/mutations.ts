import {
  canRead,
  ConflictError,
  type AnyEntity,
  type Mutation,
} from "./entities";
export function applyMutation(
  current: AnyEntity[],
  mutation: Mutation,
  userId: string,
  member: boolean,
): AnyEntity[] {
  if (!member || mutation.userId !== userId)
    throw new Error("Você não tem acesso a esta viagem.");
  const records = new Map(current.map((r) => [r.id, r]));
  const ids = new Set<string>();
  for (const c of mutation.changes) {
    const old = records.get(c.id),
      r = c.record;
    if (ids.has(c.id))
      throw new Error("Uma alteração por item é permitida em cada transação.");
    ids.add(c.id);
    if (r.id !== c.id || r.tripId !== mutation.tripId)
      throw new Error("Identidade do item inválida.");
    if (old && (!canRead(old, userId) || old.tripId !== mutation.tripId))
      throw new Error("Item privado ou de outra viagem.");
    if ((old?.version ?? null) !== c.expected) throw new ConflictError();
    if (old && (old.ownerId !== r.ownerId || old.kind !== r.kind))
      throw new Error("A autoria e o tipo do item não podem mudar.");
    if (old && old.visibility !== r.visibility && old.ownerId !== userId)
      throw new Error("Somente o autor pode mudar a privacidade.");
    if (!old && r.ownerId !== userId)
      throw new Error("A autoria precisa corresponder à conta atual.");
    records.set(r.id, {
      ...r,
      version: (old?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    } as AnyEntity);
  }
  return [...records.values()];
}
export function optimistic(
  base: AnyEntity[],
  pending: { mutation: Mutation }[],
) {
  const map = new Map(base.map((r) => [r.id, r]));
  for (const { mutation } of pending)
    for (const c of mutation.changes)
      map.set(c.id, {
        ...c.record,
        version: (c.expected ?? 0) + 1,
      } as AnyEntity);
  return [...map.values()];
}
