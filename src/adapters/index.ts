import { localAuth, localTrips, migrateStorage } from "./local";
import { cloudClient } from "./cloud";
import { createEmailAuth } from "./emailAuth";
import type { SessionAuth } from "../domain/ports";
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
