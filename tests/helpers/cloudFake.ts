import type { AnyEntity } from "../../src/domain/entities";
import type { Trip } from "../../src/domain/models";
import type {
  Cursor,
  HistoryEntry,
  LocalStore,
  PushResult,
  RecordPush,
  Remote,
  RemoteRecord,
  RemoteTrip,
  SyncMark,
} from "../../src/data/cloudSync";

/** Server with the same rules as supabase/cloud/001_sync.sql (versions, membership, privacy). */
export function createServer() {
  const trips = new Map<string, RemoteTrip & { owner: string }>();
  const members = new Map<string, Set<string>>();
  const records = new Map<string, RemoteRecord>();
  let clock = Date.parse("2027-01-01T00:00:00Z");
  const tick = () => new Date((clock += 1000)).toISOString();
  const isMember = (t: string, u: string) => !!members.get(t)?.has(u);
  return {
    trips,
    records,
    members,
    join(uid: string, tripId: string) {
      members.get(tripId)!.add(uid);
      const t = trips.get(tripId)!;
      t.data = {
        ...t.data,
        members: [
          ...t.data.members,
          {
            userId: uid,
            displayName: "Maya",
            invitationState: "accepted",
            preferences: {},
          },
        ],
      };
      t.version++;
      t.updatedAt = tick();
    },
    remote(uid: string): Remote {
      return {
        async fetchTrips() {
          return [...trips.values()].filter((t) => isMember(t.id, uid));
        },
        async fetchRecords(tripId, since) {
          if (!isMember(tripId, uid)) throw new Error("ACCESS");
          return [...records.values()].filter(
            (r) =>
              r.tripId === tripId &&
              (r.visibility === "trip" || r.ownerId === uid) &&
              (!since || Date.parse(r.updatedAt) > Date.parse(since)),
          );
        },
        async pushTrip(id, expected, data, deleted): Promise<PushResult> {
          const cur = trips.get(id);
          if (!cur) {
            if (expected !== null) return { ok: false, reason: "missing" };
            trips.set(id, {
              id,
              owner: uid,
              data,
              version: 1,
              deleted,
              updatedAt: tick(),
              joinCode: "ABC234",
            });
            members.set(id, new Set([uid]));
            return { ok: true, version: 1 };
          }
          if (!isMember(id, uid)) throw new Error("ACCESS");
          if (cur.version !== expected)
            return {
              ok: false,
              reason: "conflict",
              version: cur.version,
              data: cur.data,
              deleted: cur.deleted,
              updatedAt: cur.updatedAt,
            };
          Object.assign(cur, {
            data,
            deleted,
            version: cur.version + 1,
            updatedAt: tick(),
          });
          return { ok: true, version: cur.version };
        },
        async pushRecords(tripId, rows: RecordPush[]) {
          if (!isMember(tripId, uid)) throw new Error("ACCESS");
          const out: Record<string, PushResult> = {};
          for (const { id, expected, record } of rows) {
            const cur = records.get(id);
            if (!cur) {
              if (expected !== null) out[id] = { ok: false, reason: "missing" };
              else if (record.ownerId !== uid)
                out[id] = { ok: false, reason: "access" };
              else {
                records.set(id, {
                  id,
                  tripId,
                  ownerId: uid,
                  kind: record.kind,
                  visibility: record.visibility,
                  version: 1,
                  deleted: record.deleted,
                  data: record.data,
                  updatedAt: tick(),
                });
                out[id] = { ok: true, version: 1 };
              }
            } else if (
              cur.tripId !== tripId ||
              (cur.visibility === "private" && cur.ownerId !== uid)
            )
              out[id] = { ok: false, reason: "access" };
            else if (cur.version !== expected)
              out[id] = {
                ok: false,
                reason: "conflict",
                version: cur.version,
                data: cur.data,
                deleted: cur.deleted,
                visibility: cur.visibility,
                ownerId: cur.ownerId,
                updatedAt: cur.updatedAt,
              };
            else {
              Object.assign(cur, {
                data: record.data,
                deleted: record.deleted,
                version: cur.version + 1,
                updatedAt: tick(),
                visibility:
                  cur.ownerId === uid ? record.visibility : cur.visibility,
              });
              out[id] = { ok: true, version: cur.version };
            }
          }
          return out;
        },
      };
    },
  };
}

export function createDevice(): LocalStore & {
  history: HistoryEntry[];
  announced: string[];
  tripList: Trip[];
  recs: Map<string, AnyEntity>;
} {
  const marks = new Map<string, SyncMark | Cursor>();
  const dev = {
    history: [] as HistoryEntry[],
    announced: [] as string[],
    tripList: [] as Trip[],
    recs: new Map<string, AnyEntity>(),
    trips: () => dev.tripList.map((t) => structuredClone(t)),
    saveTrips: (t: Trip[]) => void (dev.tripList = structuredClone(t)),
    records: async () => [...dev.recs.values()].map((r) => structuredClone(r)),
    putRecord: async (r: AnyEntity) =>
      void dev.recs.set(r.id, structuredClone(r)),
    getMark: async (id: string) => marks.get(id),
    putMark: async (m: SyncMark | Cursor) => void marks.set(m.id, m),
    addHistory: async (e: HistoryEntry) => void dev.history.push(e),
    announce: (id: string) => void dev.announced.push(id),
  };
  return dev;
}
