import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trip } from "../domain/models";
import type {
  PushResult,
  RecordPush,
  Remote,
  RemoteRecord,
  RemoteTrip,
} from "../data/cloudSync";

const PAGE = 1000;

type Raw = Record<string, unknown>;
function pushResult(raw: Raw): PushResult {
  if (raw.ok === true) return { ok: true, version: Number(raw.version) };
  return {
    ok: false,
    reason: (raw.reason as "conflict" | "missing" | "access") ?? "conflict",
    version: raw.version === undefined ? undefined : Number(raw.version),
    data: raw.data,
    deleted: raw.deleted as boolean | undefined,
    visibility: raw.visibility as "trip" | "private" | undefined,
    ownerId: raw.owner_id as string | undefined,
    updatedAt: raw.updated_at as string | undefined,
  };
}
function fail(error: { message: string }): never {
  throw new Error(error.message);
}

export function createCloudRemote(
  client: Pick<SupabaseClient, "from" | "rpc">,
): Remote {
  return {
    async fetchTrips() {
      const { data, error } = await client
        .from("cloud_trips")
        .select("id,data,version,deleted,updated_at,join_code");
      if (error) fail(error);
      return (data ?? []).map((r: Raw): RemoteTrip => ({
        id: r.id as string,
        data: r.data as Trip,
        version: Number(r.version),
        deleted: !!r.deleted,
        updatedAt: r.updated_at as string,
        joinCode: r.join_code as string,
      }));
    },
    async fetchRecords(tripId, since) {
      const out: RemoteRecord[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from("cloud_records")
          .select("*")
          .eq("trip_id", tripId)
          .order("updated_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (since) query = query.gt("updated_at", since);
        const { data, error } = await query;
        if (error) fail(error);
        for (const r of (data ?? []) as Raw[])
          out.push({
            id: r.id as string,
            tripId: r.trip_id as string,
            ownerId: r.owner_id as string,
            kind: r.kind as RemoteRecord["kind"],
            visibility: r.visibility as RemoteRecord["visibility"],
            version: Number(r.version),
            deleted: !!r.deleted,
            data: r.data as RemoteRecord["data"],
            updatedAt: r.updated_at as string,
          });
        if (!data || data.length < PAGE) break;
      }
      return out;
    },
    async pushTrip(id, expected, data, deleted) {
      const { data: res, error } = await client.rpc("push_cloud_trip", {
        p_id: id,
        p_expected: expected,
        p_data: data,
        p_deleted: deleted,
      });
      if (error) fail(error);
      return pushResult(res as Raw);
    },
    async pushRecords(tripId, rows: RecordPush[]) {
      const { data, error } = await client.rpc("push_cloud_records", {
        p_trip: tripId,
        p_rows: rows.map((r) => ({
          id: r.id,
          expected: r.expected,
          kind: r.record.kind,
          owner_id: r.record.ownerId,
          visibility: r.record.visibility,
          deleted: r.record.deleted,
          data: r.record.data,
        })),
      });
      if (error) fail(error);
      const out: Record<string, PushResult> = {};
      for (const item of (data ?? []) as Raw[])
        out[item.id as string] = pushResult(item);
      return out;
    },
  };
}
