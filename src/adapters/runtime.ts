import type { SupabaseClient } from "@supabase/supabase-js";
// Legacy local-repository compatibility; never constructs a remote client.
export const isLocal = true;
export const isDemo = true;
export const configurationError = null;
export const backendClient: SupabaseClient | null = null;
