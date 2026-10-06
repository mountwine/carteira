import { backendClient, isDemo } from "../adapters";
import { get, put, remove } from "./database";
import type { Entity } from "../domain/entities";
import type { Trip, User } from "../domain/models";
import { repository } from "./repository";
interface CachedFile {
  id: string;
  blob: Blob;
}
export async function uploadFile(file: File, trip: Trip, user: User) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Use arquivos de até 10 MB.");
  if (
    ![
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ].includes(file.type)
  )
    throw new Error("Use PDF, JPG, PNG, WebP ou TXT.");
  const path = `${user.id}/${crypto.randomUUID()}`;
  if (!isDemo) {
    if (!navigator.onLine)
      throw new Error("Para enviar arquivos, conecte-se à internet.");
    const { error } = await backendClient!.storage
      .from("trip-private")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("Não foi possível enviar o arquivo.");
  } else await put("files", { id: `source:${path}`, blob: file });
  await put("files", { id: `${user.id}:${trip.id}:${path}`, blob: file });
  return { filePath: path, fileName: file.name, mime: file.type };
}
export async function documentBlob(
  doc: Entity<"document">,
  trip: Trip,
  user: User,
) {
  if (
    doc.deleted ||
    (doc.visibility === "private" && doc.ownerId !== user.id) ||
    !trip.members.some((m) => m.userId === user.id)
  )
    throw new Error("Documento privado ou indisponível.");
  if (navigator.onLine) {
    const visible = await repository.list(trip, user);
    if (!visible.some((r) => r.id === doc.id && !r.deleted))
      throw new Error("O acesso a este documento foi removido.");
  }
  if (
    !doc.data.filePath &&
    doc.data.fictitious &&
    ["/images/los-angeles.jpg", "/images/hollywood.jpg"].includes(
      doc.data.demoAsset ?? "",
    )
  ) {
    const response = await fetch(doc.data.demoAsset!);
    if (!response.ok) throw new Error("Foto de referência indisponível.");
    return response.blob();
  }
  if (!doc.data.filePath)
    return new Blob(
      [
        doc.data.fictitious
          ? `DOCUMENTO FICTÍCIO — SEM VALIDADE\n${doc.data.title}\n${doc.data.notes}`
          : doc.data.notes,
      ],
      { type: "text/plain" },
    );
  const key = `${user.id}:${trip.id}:${doc.data.filePath}`;
  const cached = await get<CachedFile>("files", key);
  if (cached) return cached.blob;
  if (!navigator.onLine && !isDemo)
    throw new Error(
      "Este arquivo ainda não foi salvo offline. Conecte-se para carregá-lo.",
    );
  let blob: Blob;
  if (isDemo) {
    const source = await get<CachedFile>(
      "files",
      `source:${doc.data.filePath}`,
    );
    if (!source) throw new Error("Arquivo local indisponível.");
    blob = source.blob;
  } else {
    const { data, error } = await backendClient!.storage
      .from("trip-private")
      .download(doc.data.filePath);
    if (error || !data)
      throw new Error("Arquivo indisponível ou sem permissão.");
    blob = data;
  }
  if (doc.data.essential) await put("files", { id: key, blob });
  return blob;
}
export async function cacheDocument(
  doc: Entity<"document">,
  trip: Trip,
  user: User,
) {
  const blob = await documentBlob(doc, trip, user);
  await put("files", {
    id: `${user.id}:${trip.id}:${doc.data.filePath || doc.id}`,
    blob,
  });
}
export async function forgetDocument(
  doc: Entity<"document">,
  trip: Trip,
  user: User,
) {
  await remove("files", `${user.id}:${trip.id}:${doc.data.filePath || doc.id}`);
}
