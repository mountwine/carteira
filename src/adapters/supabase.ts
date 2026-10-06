import { createClient } from "@supabase/supabase-js";
import type { User as AuthUser, SupabaseClient } from "@supabase/supabase-js";
import type { AuthPort, TripPort } from "../domain/ports";
import type { Trip, User } from "../domain/models";
function profile(user: AuthUser): User {
  return {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split("@")[0] || "Viajante",
    email: user.email || "",
  };
}
export function supabaseAdapters(
  url: string,
  key: string,
): { auth: AuthPort; trips: TripPort; client: SupabaseClient } {
  const client = createClient(url, key);
  const auth: AuthPort = {
    async current() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session ? profile(data.session.user) : null;
    },
    async login(email, password) {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    async signup(name, email, password) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      return data.session
        ? "Conta criada."
        : "Confira seu e-mail para confirmar a conta.";
    },
    async logout() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    subscribe(fn) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        fn(session ? profile(session.user) : null),
      );
      return () => data.subscription.unsubscribe();
    },
  };
  const trips: TripPort = {
    async list(userId) {
      const cacheKey = `travel-os:trip-cache:${userId}`;
      if (!navigator.onLine)
        return JSON.parse(localStorage.getItem(cacheKey) ?? "[]") as Trip[];
      const { data, error } = await client
        .from("trips")
        .select("*,destinations(*),trip_members(*)")
        .order("start_date");
      if (error) throw error;
      const result = (data ?? []).map(
        (row) =>
          ({
            id: row.id,
            version: row.version,
            name: row.name,
            cover: row.cover,
            startDate: row.start_date,
            endDate: row.end_date,
            currency: row.currency,
            pace: row.pace,
            isDemo: row.is_demo,
            destinations: row.destinations.map((d: Record<string, any>) => ({
              id: d.id,
              city: d.city,
              country: d.country,
              startDate: d.start_date,
              endDate: d.end_date,
              timezone: d.timezone,
              transport: d.transport,
            })),
            members: row.trip_members.map((m: Record<string, any>) => ({
              userId: m.user_id,
              displayName: m.display_name,
              invitationState: m.invitation_state,
              preferences: m.preferences,
            })),
          }) as Trip,
      );
      localStorage.setItem(cacheKey, JSON.stringify(result));
      return result;
    },
    async createDemo(user) {
      const { data, error } = await client.rpc("create_demo_trip");
      if (error) throw error;
      const list = await trips.list(user.id);
      const trip = list.find((t) => t.id === data);
      if (!trip) throw new Error("Não foi possível carregar a viagem criada.");
      return trip;
    },
  };
  return { auth, trips, client };
}
