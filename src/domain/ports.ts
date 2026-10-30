import type { User, Trip, HomeData, HomeContext } from "./models";
export interface AuthPort {
  current(): Promise<User | null>;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<string>;
  logout(): Promise<void>;
  subscribe(fn: (user: User | null) => void): () => void;
  enterDemo?(id?: string): Promise<void>;
}
/** Sign-in without password: a code is sent by email and typed back in the app. */
export interface EmailCodeAuth {
  current(): Promise<User | null>;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  updateName(name: string): Promise<void>;
  logout(): Promise<void>;
  subscribe(fn: (user: User | null) => void): () => void;
}
export type SessionAuth = Pick<AuthPort, "current" | "logout" | "subscribe">;
export interface TripPort {
  list(userId: string): Promise<Trip[]>;
  createDemo(user: User): Promise<Trip>;
}
export interface HomePort {
  load(trip: Trip, context: HomeContext): Promise<HomeData>;
}
