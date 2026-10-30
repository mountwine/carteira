import type { AnyEntity } from "../domain/entities";
import type { Trip } from "../domain/models";

/** Server view of a trip: the Trip JSON plus its own version counter. */
export interface RemoteTrip {
  id: string;
  data: Trip;
  version: number;
  deleted: boolean;
  updatedAt: string;
  joinCode: string;
}
export interface RemoteRecord {
  id: string;
  tripId: string;
  ownerId: string;
  kind: AnyEntity["kind"];
  visibility: AnyEntity["visibility"];
  version: number;
  deleted: boolean;
  data: AnyEntity["data"];
  updatedAt: string;
}
export type PushResult =
  | { ok: true; version: number }
  | {
      ok: false;
      reason: "conflict" | "missing" | "access";
      version?: number;
      data?: unknown;
      deleted?: boolean;
      visibility?: AnyEntity["visibility"];
      ownerId?: string;
      updatedAt?: string;
    };
export interface RecordPush {
  id: string;
  expected: number | null;
  record: AnyEntity;
}
export interface Remote {
  fetchTrips(): Promise<RemoteTrip[]>;
  fetchRecords(tripId: string, since: string | null): Promise<RemoteRecord[]>;
  pushTrip(
    id: string,
    expected: number | null,
    data: Trip,
    deleted: boolean,
  ): Promise<PushResult>;
  pushRecords(
    tripId: string,
    rows: RecordPush[],
  ): Promise<Record<string, PushResult>>;
}

/** What the device remembers about the last state it agreed on with the server. */
export interface SyncMark {
  id: string;
  remoteVersion: number;
  hash: string;
}
export interface Cursor {
  id: string;
  at: string;
}
export interface HistoryEntry {
  id: string;
  recordId: string;
  tripId: string;
  actor: string;
  previous: unknown;
  at: string;
  note?: string;
}
/** Local storage seen by the engine: the browser in production, memory in tests. */
export interface LocalStore {
  trips(): Trip[];
  saveTrips(trips: Trip[]): void;
  records(): Promise<AnyEntity[]>;
  putRecord(record: AnyEntity): Promise<void>;
  getMark(id: string): Promise<SyncMark | Cursor | undefined>;
  putMark(mark: SyncMark | Cursor): Promise<void>;
  addHistory(entry: HistoryEntry): Promise<void>;
  announce(tripId: string): void;
}

export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Trip fingerprint ignores the local version counter. */
export const tripHash = (trip: Trip) =>
  stable({ ...trip, version: undefined, deleted: !!trip.deleted });
/** Record fingerprint covers only what travels to the server. */
export const recordHash = (r: AnyEntity) =>
  stable({ data: r.data, deleted: r.deleted, visibility: r.visibility });

const tripMark = (uid: string, id: string) => `sync:${uid}:trip:${id}`;
const recMark = (uid: string, id: string) => `sync:${uid}:rec:${id}`;
const cursorId = (uid: string, tripId: string, pass = "") =>
  `sync:${uid}:cursor:${tripId}${pass}`;
const OVERLAP_MS = 5000;
const newer = (a: string | undefined, b: string | undefined) =>
  Date.parse(a ?? "") > Date.parse(b ?? "");
const BATCH = 100;

const entityOf = (r: RemoteRecord) =>
  ({
    id: r.id,
    tripId: r.tripId,
    kind: r.kind,
    ownerId: r.ownerId,
    visibility: r.visibility,
    version: r.version,
    updatedAt: r.updatedAt,
    deleted: r.deleted,
    data: r.data,
  }) as AnyEntity;

const isMine = (t: Trip, uid: string) =>
  t.members.some((m) => m.userId === uid && m.invitationState === "accepted");

export interface SyncOutcome {
  tripsChanged: boolean;
  changedTrips: string[];
  pushed: number;
  pulled: number;
}

export async function syncOnce(
  uid: string,
  remote: Remote,
  store: LocalStore,
  now: () => Date = () => new Date(),
  options: { trips?: boolean; only?: "photo" } = {},
): Promise<SyncOutcome> {
  const outcome: SyncOutcome = {
    tripsChanged: false,
    changedTrips: [],
    pushed: 0,
    pulled: 0,
  };
  const touched = new Set<string>();
  const backup = (record: AnyEntity | Trip, tripId: string, note: string) =>
    store.addHistory({
      id: crypto.randomUUID(),
      recordId: record.id,
      tripId,
      actor: uid,
      previous: record,
      at: now().toISOString(),
      note,
    });

  // ---- Trips ----------------------------------------------------------
  if (options.trips !== false) {
    let trips = store.trips();
    const remoteTrips = await remote.fetchTrips();
    const adopt = async (r: RemoteTrip, local?: Trip) => {
      if (local) await backup(local, local.id, "sync-conflict-trip");
      const next: Trip = {
        ...r.data,
        deleted: r.deleted || undefined,
        version: (local?.version ?? 0) + 1,
      };
      trips = [...trips.filter((t) => t.id !== r.id), next];
      store.saveTrips(trips);
      await store.putMark({
        id: tripMark(uid, r.id),
        remoteVersion: r.version,
        hash: tripHash(next),
      });
      outcome.tripsChanged = true;
      touched.add(r.id);
      outcome.pulled++;
    };
    for (const r of remoteTrips) {
      const local = trips.find((t) => t.id === r.id);
      const mark = (await store.getMark(tripMark(uid, r.id))) as
        SyncMark | undefined;
      if (!local) {
        await adopt(r);
        continue;
      }
      if (mark && mark.remoteVersion === r.version) continue;
      const dirty = !mark || tripHash(local) !== mark.hash;
      if (!dirty || r.version > (mark?.remoteVersion ?? 0))
        await adopt(r, dirty ? local : undefined);
    }
    for (const local of trips.filter((t) => isMine(t, uid) && !t.isDemo)) {
      const r = remoteTrips.find((x) => x.id === local.id);
      const mark = (await store.getMark(tripMark(uid, local.id))) as
        SyncMark | undefined;
      const current = store.trips().find((t) => t.id === local.id);
      if (!current) continue;
      if (!r && mark) continue; // access lost (left the trip): keep the local copy untouched
      if (mark && tripHash(current) === mark.hash) continue;
      let result: PushResult;
      try {
        result = await remote.pushTrip(
          current.id,
          r ? (mark?.remoteVersion ?? r.version) : null,
          { ...current, version: undefined } as Trip,
          !!current.deleted,
        );
      } catch (e) {
        if (/ACCESS/.test(String((e as Error)?.message))) continue;
        throw e;
      }
      if (result.ok) {
        await store.putMark({
          id: tripMark(uid, current.id),
          remoteVersion: result.version,
          hash: tripHash(current),
        });
        outcome.pushed++;
      } else if (result.reason === "conflict" && result.data) {
        await adopt(
          {
            id: current.id,
            data: result.data as Trip,
            version: result.version ?? 0,
            deleted: !!result.deleted,
            updatedAt: result.updatedAt ?? "",
            joinCode: "",
          },
          current,
        );
      }
    }
  }

  // ---- Records, trip by trip -------------------------------------------
  const mineTrips = store.trips().filter((t) => isMine(t, uid) && !t.isDemo);
  for (const trip of mineTrips) {
    const known = await store.getMark(tripMark(uid, trip.id));
    if (!known) continue; // never reached the server yet
    const cursor = (await store.getMark(
      cursorId(uid, trip.id, options.only ? ":" + options.only : ""),
    )) as Cursor | undefined;
    const since = cursor
      ? new Date(Date.parse(cursor.at) - OVERLAP_MS).toISOString()
      : null;
    let incoming: RemoteRecord[];
    try {
      incoming = await remote.fetchRecords(trip.id, since);
    } catch (e) {
      if (/ACCESS/.test(String((e as Error)?.message))) continue;
      throw e;
    }
    let local = new Map((await store.records()).map((r) => [r.id, r]));
    let newest = cursor?.at ?? "";
    const take = async (r: RemoteRecord, previous?: AnyEntity) => {
      if (previous) await backup(previous, trip.id, "sync-conflict-record");
      const next = entityOf(r);
      await store.putRecord(next);
      local.set(next.id, next);
      await store.putMark({
        id: recMark(uid, r.id),
        remoteVersion: r.version,
        hash: recordHash(next),
      });
      touched.add(trip.id);
      outcome.pulled++;
    };
    // Photos have their own pass (and their own cursor); everything else goes in the main one.
    const wanted = (kind: string) =>
      options.only === "photo" ? kind === "photo" : kind !== "photo";
    for (const r of incoming) {
      if (!wanted(r.kind)) continue;
      if (r.updatedAt > newest) newest = r.updatedAt;
      const mark = (await store.getMark(recMark(uid, r.id))) as
        SyncMark | undefined;
      if (mark && mark.remoteVersion === r.version) continue;
      const x = local.get(r.id);
      const dirty = !!x && (!mark || recordHash(x) !== mark.hash);
      if (!x || !dirty) await take(r);
      else if (newer(r.updatedAt, x.updatedAt)) await take(r, x);
      else {
        // this device is newer: keep a copy of the server version it will overwrite
        await backup(entityOf(r), trip.id, "sync-overwritten-remote");
        await store.putMark({
          id: recMark(uid, r.id),
          remoteVersion: r.version,
          hash: mark?.hash ?? "",
        });
      }
    }
    if (newest && newest !== cursor?.at)
      await store.putMark({
        id: cursorId(uid, trip.id, options.only ? ":" + options.only : ""),
        at: newest,
      });

    // push what changed here
    local = new Map((await store.records()).map((r) => [r.id, r]));
    const dirty: RecordPush[] = [];
    for (const x of local.values()) {
      if (x.tripId !== trip.id) continue;
      const mark = (await store.getMark(recMark(uid, x.id))) as
        SyncMark | undefined;
      if (mark && mark.hash === recordHash(x)) continue;
      dirty.push({
        id: x.id,
        expected: mark?.remoteVersion ?? null,
        record: x,
      });
    }
    for (let i = 0; i < dirty.length; i += BATCH) {
      const batch = dirty.slice(i, i + BATCH);
      let results: Record<string, PushResult>;
      try {
        results = await remote.pushRecords(trip.id, batch);
      } catch (e) {
        if (/ACCESS/.test(String((e as Error)?.message))) break;
        throw e;
      }
      for (const row of batch) {
        const res = results[row.id];
        if (!res) continue;
        if (res.ok) {
          await store.putMark({
            id: recMark(uid, row.id),
            remoteVersion: res.version,
            hash: recordHash(row.record),
          });
          outcome.pushed++;
        } else if (res.reason === "conflict" && res.version !== undefined) {
          const mine = row.record;
          if (newer(res.updatedAt, mine.updatedAt))
            await take(
              {
                id: mine.id,
                tripId: trip.id,
                ownerId: res.ownerId ?? mine.ownerId,
                kind: mine.kind,
                visibility: res.visibility ?? mine.visibility,
                version: res.version,
                deleted: !!res.deleted,
                data: res.data as AnyEntity["data"],
                updatedAt: res.updatedAt ?? mine.updatedAt,
              },
              mine,
            );
          else {
            // local is newer: keep a copy of the server version, then push over it next round
            await backup(
              {
                id: mine.id,
                tripId: trip.id,
                kind: mine.kind,
                ownerId: res.ownerId ?? mine.ownerId,
                visibility: res.visibility ?? mine.visibility,
                version: res.version,
                updatedAt: res.updatedAt ?? "",
                deleted: !!res.deleted,
                data: res.data as AnyEntity["data"],
              } as AnyEntity,
              trip.id,
              "sync-overwritten-remote",
            );
            await store.putMark({
              id: recMark(uid, row.id),
              remoteVersion: res.version,
              hash: "",
            });
          }
        }
      }
    }
  }
  outcome.changedTrips = [...touched];
  for (const id of touched) store.announce(id);
  return outcome;
}

/** Runs syncOnce one at a time and when something suggests the data changed. */
export function createSyncService(options: {
  uid: string;
  remote: Remote;
  store: LocalStore;
  onTripsChanged: () => void;
  onStatus?: (status: SyncStatus) => void;
  /** Runs after each successful round, e.g. to sync picture files. */
  afterSync?: () => Promise<void>;
}) {
  let running: Promise<void> | null = null;
  let again = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const cleanups: Array<() => void> = [];
  const status = (s: SyncStatus) => options.onStatus?.(s);
  async function run() {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          status({ state: "offline" });
          return;
        }
        status({ state: "syncing" });
        const out = await syncOnce(options.uid, options.remote, options.store);
        if (out.tripsChanged) options.onTripsChanged();
        await options.afterSync?.();
        status({ state: "ok", at: new Date().toISOString() });
      } catch (e) {
        status({
          state: "error",
          message: e instanceof Error ? e.message : "Falha ao sincronizar.",
        });
      } finally {
        running = null;
        if (again) {
          again = false;
          void run();
        }
      }
    })();
    return running;
  }
  return {
    run,
    start() {
      void run();
      timer = setInterval(() => void run(), 30000);
      const poke = () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => void run(), 2500);
      };
      const visible = () => {
        if (document.visibilityState === "visible") void run();
      };
      window.addEventListener("online", poke);
      window.addEventListener("travel-os-media", poke);
      document.addEventListener("visibilitychange", visible);
      const channel =
        typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel("travel-os-data")
          : null;
      channel?.addEventListener("message", poke);
      cleanups.push(
        () => window.removeEventListener("online", poke),
        () => window.removeEventListener("travel-os-media", poke),
        () => document.removeEventListener("visibilitychange", visible),
        () => channel?.close(),
      );
    },
    stop() {
      clearInterval(timer);
      clearTimeout(debounce);
      cleanups.splice(0).forEach((fn) => fn());
    },
  };
}
export type SyncStatus =
  | { state: "idle" }
  | { state: "syncing" }
  | { state: "offline" }
  | { state: "ok"; at: string }
  | { state: "error"; message: string };
