import { localAuth, localTrips } from "./local";
export { isLocal, isDemo, configurationError, backendClient } from "./runtime";
export const services = {
  auth: localAuth,
  trips: {
    list: localTrips,
    async createDemo() {
      throw new Error("Crie uma viagem com seus dados.");
    },
  },
};
