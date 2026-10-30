import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function build(): { client: SupabaseClient | null; error: string | null } {
  if (!url && !key) return { client: null, error: null };
  if (!url || !key)
    return {
      client: null,
      error:
        "Login por e-mail desativado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    };
  try {
    return {
      client: createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      }),
      error: null,
    };
  } catch {
    return {
      client: null,
      error:
        "Login por e-mail desativado: confira VITE_SUPABASE_URL (deve ser https://CODIGO.supabase.co).",
    };
  }
}

const built = build();
/** Public (anon) key only: access is limited by row-level security in the database. */
export const cloudClient: SupabaseClient | null = built.client;
/** Set when the variables exist but are unusable; the app then keeps the local login. */
export const cloudConfigError: string | null = built.error;
