import type { User, Trip, HomeData, HomeContext } from "./models";
export interface AuthPort {
  current(): Promise<User | null>;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<string>;
  logout(): Promise<void>;
  subscribe(fn: (user: User | null) => void): () => void;
  enterDemo?(id?: string): Promise<void>;
}
export interface TripPort {
  list(userId: string): Promise<Trip[]>;
  createDemo(user: User): Promise<Trip>;
}
export interface HomePort {
  load(trip: Trip, context: HomeContext): Promise<HomeData>;
}
