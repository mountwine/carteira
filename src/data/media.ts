import { all, get, put } from "./database";
export interface Photo {
  id: string;
  tripId: string;
  ownerId: string;
  type: "album" | "cover" | "shopping";
  blob: Blob;
  thumbnail: Blob;
  name: string;
  date: string;
  time?: string;
  location: string;
  caption: string;
  metadataDate?: boolean;
  deleted?: boolean;
  createdAt: string;
}
function image(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob),
      img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error("Formato de imagem não suportado. Use JPEG, PNG ou WebP."),
      );
    };
    img.src = url;
  });
}
async function resize(img: HTMLImageElement, max: number, quality: number) {
  const ratio = Math.min(
    1,
    max / Math.max(img.naturalWidth, img.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Não foi possível salvar a imagem.")),
      "image/jpeg",
      quality,
    ),
  );
}
/** Read the EXIF TIFF directory, prioritizing DateTimeOriginal over modification date. */
export function photoDate(
  buffer: ArrayBuffer,
): { date: string; time: string } | null {
  try {
    const v = new DataView(buffer);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
    let pos = 2;
    while (pos + 4 <= v.byteLength) {
      const marker = v.getUint16(pos);
      if (marker === 0xffda || marker === 0xffd9) break;
      const length = v.getUint16(pos + 2);
      if (length < 2 || pos + 2 + length > v.byteLength) return null;
      if (
        marker === 0xffe1 &&
        length >= 10 &&
        v.getUint32(pos + 4) === 0x45786966 &&
        v.getUint16(pos + 8) === 0
      ) {
        const base = pos + 10,
          end = pos + 2 + length,
          le = v.getUint16(base) === 0x4949;
        if (!le && v.getUint16(base) !== 0x4d4d) return null;
        const u16 = (p: number) => v.getUint16(p, le),
          u32 = (p: number) => v.getUint32(p, le);
        if (u16(base + 2) !== 42) return null;
        const directory = (offset: number) => {
          const at = base + offset;
          if (at < base || at + 2 > end) throw new Error();
          const count = u16(at);
          if (at + 2 + count * 12 > end) throw new Error();
          const tags = new Map<
            number,
            { type: number; count: number; value: number; entry: number }
          >();
          for (let i = 0; i < count; i++) {
            const entry = at + 2 + i * 12;
            tags.set(u16(entry), {
              type: u16(entry + 2),
              count: u32(entry + 4),
              value: u32(entry + 8),
              entry,
            });
          }
          return tags;
        };
        const root = directory(u32(base + 4)),
          sub = root.get(0x8769),
          exif = sub?.type === 4 ? directory(sub.value) : new Map();
        const tag = exif.get(0x9003) ?? exif.get(0x9004) ?? root.get(0x132);
        if (tag?.type === 2 && tag.count >= 19) {
          const at = tag.count <= 4 ? tag.entry + 8 : base + tag.value;
          if (at < base || at + 19 > end) return null;
          let text = "";
          for (let i = 0; i < 19; i++)
            text += String.fromCharCode(v.getUint8(at + i));
          if (!/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) return null;
          const date = text.slice(0, 10).replaceAll(":", "-"),
            time = text.slice(11, 16),
            parsed = new Date(date + "T" + time + ":00Z");
          if (
            !Number.isFinite(parsed.getTime()) ||
            parsed.toISOString().slice(0, 16) !== date + "T" + time
          )
            return null;
          return { date, time };
        }
      }
      pos += 2 + length;
    }
  } catch {
    /* Invalid metadata must never prevent photo import. */
  }
  return null;
}
export async function importPhoto(
  file: File,
  tripId: string,
  ownerId: string,
  type: Photo["type"] = "album",
  fallbackDate = new Date().toLocaleDateString("en-CA"),
  id: string = crypto.randomUUID(),
) {
  if (!file.type.startsWith("image/") || file.size > 30 * 1024 * 1024)
    throw new Error("Use uma imagem de até 30 MB.");
  const img = await image(file),
    metadata = photoDate(await file.arrayBuffer());
  const photo: Photo = {
    id,
    tripId,
    ownerId,
    type,
    blob: await resize(img, 2200, 0.9),
    thumbnail: await resize(img, 420, 0.78),
    name: file.name,
    date: metadata?.date ?? fallbackDate,
    time: metadata?.time,
    metadataDate: !!metadata,
    location: "",
    caption: "",
    createdAt: new Date().toISOString(),
  };
  await put("media", photo);
  window.dispatchEvent(new Event("travel-os-media"));
  return photo;
}
export async function photos(tripId: string, type: Photo["type"] = "album") {
  return (await all<Photo>("media"))
    .filter((p) => p.tripId === tripId && p.type === type && !p.deleted)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time ?? "").localeCompare(b.time ?? "") ||
        a.createdAt.localeCompare(b.createdAt),
    );
}
export function subscribeToPhotos(
  tripId: string,
  onUpdate: (items: Photo[]) => void,
  events: Pick<
    EventTarget,
    "addEventListener" | "removeEventListener"
  > = window,
) {
  let active = true;
  const load = () =>
    void photos(tripId).then((items) => {
      if (active) onUpdate(items);
    });
  events.addEventListener("travel-os-media", load);
  load();
  return () => {
    active = false;
    events.removeEventListener("travel-os-media", load);
  };
}
export async function mediaBlob(id: string, thumb = false) {
  const photo = await get<Photo>("media", id);
  if (!photo || photo.deleted) throw new Error("Foto indisponível.");
  return thumb ? photo.thumbnail : photo.blob;
}

/** Non-destructive import of V1 memory image attachments. Source records remain intact. */
export async function migrateAlbum(tripId: string, ownerId: string) {
  const records = await all<import("../domain/entities").AnyEntity>("records");
  for (const record of records) {
    if (record.kind !== "memory" || record.tripId !== tripId || record.deleted)
      continue;
    for (const docId of record.data.photoIds) {
      const id = `legacy:${tripId}:${docId}`;
      if (await get("media", id)) continue;
      const doc = records.find(
        (r) => r.kind === "document" && r.id === docId && !r.deleted,
      );
      if (
        !doc ||
        doc.kind !== "document" ||
        (doc.visibility === "private" && doc.ownerId !== ownerId) ||
        !doc.data.filePath
      )
        continue;
      const file =
        (await get<{ id: string; blob: Blob }>(
          "files",
          `${ownerId}:${tripId}:${doc.data.filePath}`,
        )) ??
        (await get<{ id: string; blob: Blob }>(
          "files",
          `source:${doc.data.filePath}`,
        ));
      if (!file?.blob?.type.startsWith("image/")) continue;
      try {
        const photo = await importPhoto(
          new File([file.blob], doc.data.fileName || "foto.jpg", {
            type: file.blob.type,
          }),
          tripId,
          ownerId,
          "album",
          record.data.date,
          id,
        );
        await put("media", {
          ...photo,
          caption: record.data.notes || record.data.title,
        });
      } catch {
        /* Original attachment remains accessible through Documents. */
      }
    }
  }
}
