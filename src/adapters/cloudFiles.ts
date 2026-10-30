import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhotoFiles } from "../data/photoSync";

const BUCKET = "trip-photos";
const fail = (error: { message?: string }): never => {
  throw new Error(error.message ?? "Falha no armazenamento de fotos.");
};

export function createPhotoFiles(
  client: Pick<SupabaseClient, "storage">,
): PhotoFiles {
  const bucket = () => client.storage.from(BUCKET);
  return {
    async upload(path, blob) {
      const { error } = await bucket().upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (error) fail(error);
    },
    async download(path) {
      const { data, error } = await bucket().download(path);
      if (error || !data) return fail(error ?? {});
      return data;
    },
    async remove(paths) {
      const { error } = await bucket().remove(paths);
      if (error) fail(error);
    },
  };
}
