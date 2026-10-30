import type { AnyEntity } from "../domain/entities";
import type { Photo } from "./media";
import {
  recordHash,
  syncOnce,
  type LocalStore,
  type Remote,
  type SyncMark,
} from "./cloudSync";

/** Where the picture files live: the cloud storage in production, memory in tests. */
export interface PhotoFiles {
  upload(path: string, blob: Blob): Promise<void>;
  download(path: string): Promise<Blob>;
  remove(paths: string[]): Promise<void>;
}
export interface MediaStore {
  list(): Promise<Photo[]>;
  put(photo: Photo): Promise<void>;
}

export const fullPath = (p: Pick<Photo, "tripId" | "id">) =>
  `${p.tripId}/${p.id}.jpg`;
export const thumbPath = (p: Pick<Photo, "tripId" | "id">) =>
  `${p.tripId}/${p.id}.thumb.jpg`;
const fileMark = (uid: string, id: string) => `sync:${uid}:file:${id}`;
const recMark = (uid: string, id: string) => `sync:${uid}:rec:${id}`;

/** What travels as a record: everything but the picture files and local flags. */
export function photoMeta(p: Photo) {
  return {
    type: p.type,
    name: p.name,
    date: p.date,
    time: p.time,
    location: p.location,
    caption: p.caption,
    metadataDate: p.metadataDate,
    createdAt: p.createdAt,
  };
}
export const photoEntity = (p: Photo) =>
  ({
    id: p.id,
    tripId: p.tripId,
    kind: "photo",
    ownerId: p.ownerId,
    visibility: "trip",
    version: 0,
    updatedAt: p.updatedAt ?? p.createdAt,
    deleted: !!p.deleted,
    data: photoMeta(p),
  }) as unknown as AnyEntity;

/** Lets the record engine sync photos' details as if they were records. */
export function createPhotoStore(
  uid: string,
  base: LocalStore,
  media: MediaStore,
): LocalStore {
  const hasFiles = (id: string) => base.getMark(fileMark(uid, id));
  return {
    trips: () => base.trips(),
    saveTrips: () => {},
    async records() {
      const out: AnyEntity[] = [];
      for (const p of await media.list())
        // Metadata only goes up after the files did, so nobody sees an empty photo.
        if (p.remote || (await hasFiles(p.id))) out.push(photoEntity(p));
      return out;
    },
    async putRecord(entity) {
      const meta = entity.data as unknown as ReturnType<typeof photoMeta>;
      const current = (await media.list()).find((p) => p.id === entity.id);
      if (current) {
        await media.put({
          ...current,
          ...meta,
          deleted: entity.deleted,
          updatedAt: entity.updatedAt,
        });
        return;
      }
      await media.put({
        ...meta,
        id: entity.id,
        tripId: entity.tripId,
        ownerId: entity.ownerId,
        blob: new Blob([]),
        thumbnail: new Blob([]),
        deleted: entity.deleted,
        updatedAt: entity.updatedAt,
        remote: "stub",
      });
      await base.putMark({
        id: fileMark(uid, entity.id),
        remoteVersion: 1,
        hash: "uploaded",
      });
    },
    getMark: (id) => base.getMark(id),
    putMark: (m) => base.putMark(m),
    addHistory: (e) => base.addHistory(e),
    announce: (id) => base.announce(id),
  };
}

export interface PhotoSyncResult {
  uploaded: number;
  changed: number;
}

/** Uploads new pictures, syncs their details, fetches thumbnails and frees deleted files. */
export async function syncPhotos(
  uid: string,
  remote: Remote,
  files: PhotoFiles,
  media: MediaStore,
  base: LocalStore,
  onChange: () => void = () => {},
): Promise<PhotoSyncResult> {
  const result: PhotoSyncResult = { uploaded: 0, changed: 0 };
  const mine = (await base.trips()).filter((t) =>
    t.members.some((m) => m.userId === uid && m.invitationState === "accepted"),
  );
  const tripIds = new Set(mine.map((t) => t.id));

  // 1. Pictures made on this device go up first.
  for (const p of await media.list()) {
    if (p.remote || p.deleted || p.ownerId !== uid || !tripIds.has(p.tripId))
      continue;
    if (await base.getMark(fileMark(uid, p.id))) continue;
    try {
      await files.upload(fullPath(p), p.blob);
      await files.upload(thumbPath(p), p.thumbnail);
    } catch {
      continue; // offline or not allowed yet: try again next round
    }
    await base.putMark({
      id: fileMark(uid, p.id),
      remoteVersion: 1,
      hash: "uploaded",
    });
    result.uploaded++;
  }

  // 2. Details of every photo, both ways.
  const out = await syncOnce(
    uid,
    remote,
    createPhotoStore(uid, base, media),
    undefined,
    { trips: false, only: "photo" },
  );
  result.changed += out.pulled;

  // 3. Thumbnails of photos that arrived from other devices.
  for (const p of await media.list()) {
    if (p.remote !== "stub" || p.deleted) continue;
    try {
      const thumbnail = await files.download(thumbPath(p));
      await media.put({ ...p, thumbnail, blob: thumbnail, remote: "thumb" });
      result.changed++;
    } catch {
      /* not uploaded yet, or offline: next round */
    }
  }

  // 4. Deleted photos: once the deletion reached the server, free the files.
  for (const p of await media.list()) {
    if (!p.deleted) continue;
    const marked = (await base.getMark(fileMark(uid, p.id))) as
      SyncMark | undefined;
    const synced = (await base.getMark(recMark(uid, p.id))) as
      SyncMark | undefined;
    if (
      marked?.hash !== "uploaded" ||
      synced?.hash !== recordHash(photoEntity(p))
    )
      continue;
    try {
      await files.remove([fullPath(p), thumbPath(p)]);
      await base.putMark({
        id: fileMark(uid, p.id),
        remoteVersion: 1,
        hash: "removed",
      });
    } catch {
      /* try again next round */
    }
  }

  if (result.changed || result.uploaded) onChange();
  return result;
}
