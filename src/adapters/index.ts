import { localAuth, localTrips, migrateStorage } from "./local";
import { cloudClient } from "./cloud";
import { createEmailAuth } from "./emailAuth";
import { createCloudRemote } from "./cloudRemote";
import { browserStore } from "../data/browserStore";
import { createSyncService, type SyncStatus } from "../data/cloudSync";
import type { SessionAuth } from "../domain/ports";
import type { User } from "../domain/models";
export { isLocal, isDemo, configurationError, backendClient } from "./runtime";

/** Present only when the public Supabase variables are set; otherwise the local login stays in use. */
export const emailAuth = cloudClient
  ? createEmailAuth(cloudClient, migrateStorage)
  : null;
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
  const service = createSyncService({
    uid: user.id,
    remote: createCloudRemote(cloudClient),
    store: browserStore,
    onTripsChanged,
    onStatus,
  });
  service.start();
  return service;
}
