import { localAuth, localTrips, migrateStorage } from "./local";
import { cloudClient } from "./cloud";
import { createEmailAuth } from "./emailAuth";
import { createCloudRemote } from "./cloudRemote";
import { createTripCodeApi } from "./tripCodeApi";
import { browserMedia, browserStore } from "../data/browserStore";
import { setPhotoLoader } from "../data/media";
import { createPhotoFiles } from "./cloudFiles";
import { fullPath, syncPhotos } from "../data/photoSync";
import { createSyncService, type SyncStatus } from "../data/cloudSync";
import type { SessionAuth } from "../domain/ports";
import type { User } from "../domain/models";
export { isLocal, isDemo, configurationError, backendClient } from "./runtime";

/** Present only when the public Supabase variables are set; otherwise the local login stays in use. */
export const emailAuth = cloudClient
  ? createEmailAuth(cloudClient, migrateStorage)
  : null;
/** Join, show, renew and leave by trip code; null without online login. */
export const tripCodes = cloudClient ? createTripCodeApi(cloudClient) : null;
export const services = {
  auth: (emailAuth ?? localAuth) as SessionAuth,
  trips: {
    list: localTrips,
    async createDemo() {
      throw new Error("Crie uma viagem com seus dados.");
    },
  },
};

/** Keeps this device and the account in step; null when online login is not configured. */
export function startCloudSync(
  user: User,
  onTripsChanged: () => void,
  onStatus: (status: SyncStatus) => void,
) {
  if (!cloudClient) return null;
  const remote = createCloudRemote(cloudClient);
  const files = createPhotoFiles(cloudClient);
  setPhotoLoader((photo) => files.download(fullPath(photo)));
  const service = createSyncService({
    uid: user.id,
    remote,
    store: browserStore,
    onTripsChanged,
    onStatus,
    afterSync: async () => {
      await syncPhotos(user.id, remote, files, browserMedia, browserStore, () =>
        window.dispatchEvent(new Event("travel-os-media")),
      );
    },
  });
  service.start();
  return {
    ...service,
    stop() {
      service.stop();
      setPhotoLoader(null);
    },
  };
}
