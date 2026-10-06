import type { AuthPort, TripPort, HomePort } from "../domain/ports";
import type { User, Trip } from "../domain/models";
import { demoHome, emptyHome } from "./seed";
import {
  listLocalTrips,
  createLocalDemo,
  demoTravelers,
} from "./tripManagement";
const sessionKey = "travel-os:demo-session:v1";
function read<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(
      "Dados locais inválidos. Limpe os dados deste site para reiniciar a demonstração.",
    );
  }
}
const listeners = new Set<(u: User | null) => void>();
export const demoAuth: AuthPort = {
  async current() {
    return read<User | null>(sessionKey, null);
  },
  async enterDemo(id = "demo-leo") {
    const user = demoTravelers.find((u) => u.id === id) ?? demoTravelers[0];
    localStorage.setItem(sessionKey, JSON.stringify(user));
    listeners.forEach((fn) => fn(user));
  },
  async login() {
    throw new Error("Configure Supabase para usar uma conta real.");
  },
  async signup() {
    throw new Error("Configure Supabase para criar uma conta real.");
  },
  async logout() {
    localStorage.removeItem(sessionKey);
    listeners.forEach((fn) => fn(null));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
export const demoTrips: TripPort = {
  list: listLocalTrips,
  createDemo: createLocalDemo,
};
export const mockHome: HomePort = {
  async load(trip) {
    return structuredClone(trip.isDemo ? demoHome : emptyHome);
  },
};
