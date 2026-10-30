import type { SupabaseClient } from "@supabase/supabase-js";
import { joinFailure } from "../domain/tripCode";

export interface TripCodeInfo {
  code: string;
  role: "owner" | "member";
}

function failure(error: { message?: string }): Error {
  const text = error.message ?? "";
  if (/failed to fetch|network|load failed/i.test(text))
    return new Error("Sem conexão. Conecte-se à internet e tente de novo.");
  if (/OWNER/.test(text))
    return new Error("O dono da viagem não pode sair dela.");
  if (/ACCESS/.test(text))
    return new Error("Só o dono da viagem pode fazer isso.");
  if (/AUTH/.test(text)) return new Error("Entre na sua conta para continuar.");
  return new Error("Não foi possível concluir. Tente novamente.");
}

export function createTripCodeApi(
  client: Pick<SupabaseClient, "from" | "rpc">,
) {
  return {
    /** Joins the trip behind the code; returns its id. */
    async join(code: string, name: string): Promise<string> {
      const { data, error } = await client.rpc("join_cloud_trip", {
        p_code: code,
        p_name: name,
      });
      if (error) throw failure(error);
      const result = data as {
        ok?: boolean;
        reason?: string;
        trip_id?: string;
      };
      if (!result?.ok || !result.trip_id)
        throw new Error(joinFailure(result?.reason));
      return result.trip_id;
    },
    /** Code and the caller's role; null when the trip is not on the server yet. */
    async info(tripId: string, uid: string): Promise<TripCodeInfo | null> {
      const trip = await client
        .from("cloud_trips")
        .select("join_code")
        .eq("id", tripId)
        .maybeSingle();
      if (trip.error) throw failure(trip.error);
      if (!trip.data) return null;
      const member = await client
        .from("cloud_members")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", uid)
        .maybeSingle();
      if (member.error) throw failure(member.error);
      if (!member.data) return null;
      return {
        code: (trip.data as { join_code: string }).join_code,
        role: (member.data as { role: "owner" | "member" }).role,
      };
    },
    async rotate(tripId: string): Promise<string> {
      const { data, error } = await client.rpc("rotate_cloud_code", {
        p_trip: tripId,
      });
      if (error) throw failure(error);
      return data as string;
    },
    async leave(tripId: string): Promise<void> {
      const { error } = await client.rpc("leave_cloud_trip", {
        p_trip: tripId,
      });
      if (error) throw failure(error);
    },
  };
}
