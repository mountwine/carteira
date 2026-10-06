import type { Trip, User } from "../domain/models";
import {
  type AnyEntity,
  type Mutation,
  ConflictError,
  canRead,
} from "../domain/entities";
import { applyMutation } from "../domain/mutations";
import { all, database, completed, requestResult } from "./database";
import { backendClient, isDemo } from "../adapters";
export interface RecordPort {
  list(trip: Trip, user: User): Promise<AnyEntity[]>;
  commit(mutation: Mutation, trip: Trip, user: User): Promise<void>;
  subscribe(tripId: string, fn: () => void): () => void;
}
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("travel-os-data")
    : null;
export const repository: RecordPort = isDemo
  ? {
      async list(trip, user) {
        if (
          !trip.members.some(
            (m) => m.userId === user.id && m.invitationState === "accepted",
          )
        )
          throw new Error("Acesso à viagem não permitido.");
        return (await all<AnyEntity>("records")).filter(
          (r) => r.tripId === trip.id && canRead(r, user.id),
        );
      },
      async commit(mutation, trip, user) {
        const db = await database(),
          tx = db.transaction(["records", "receipts", "history"], "readwrite");
        const done = completed(tx);
        try {
          const receipt = await requestResult(
            tx.objectStore("receipts").get(mutation.id),
          );
          if (!receipt) {
            const current = await requestResult<AnyEntity[]>(
              tx.objectStore("records").getAll(),
            );
            const next = applyMutation(
              current,
              mutation,
              user.id,
              trip.members.some(
                (m) => m.userId === user.id && m.invitationState === "accepted",
              ),
            );
            for (const c of mutation.changes) {
              const record = next.find((r) => r.id === c.id)!;
              tx.objectStore("records").put(record);
              tx.objectStore("history").put({
                id: crypto.randomUUID(),
                recordId: record.id,
                tripId: trip.id,
                actor: user.id,
                previous: current.find((r) => r.id === record.id),
                at: mutation.at,
              });
            }
            tx.objectStore("receipts").put({ id: mutation.id });
          }
        } catch (e) {
          tx.abort();
          await done.catch(() => {});
          throw e;
        }
        await done;
        channel?.postMessage(trip.id);
      },
      subscribe(tripId, fn) {
        const listener = (e: MessageEvent) => {
          if (e.data === tripId) fn();
        };
        channel?.addEventListener("message", listener);
        return () => channel?.removeEventListener("message", listener);
      },
    }
  : {
      async list(trip) {
        const { data, error } = await backendClient!
          .from("travel_records")
          .select("*")
          .eq("trip_id", trip.id);
        if (error) throw error;
        return (data ?? []).map(
          (r) =>
            ({
              id: r.id,
              tripId: r.trip_id,
              ownerId: r.owner_id,
              kind: r.kind,
              visibility: r.visibility,
              version: r.version,
              updatedAt: r.updated_at,
              deleted: r.deleted,
              data: r.data,
            }) as AnyEntity,
        );
      },
      async commit(mutation) {
        const { error } = await backendClient!.rpc("commit_travel_changes", {
          request_id: mutation.id,
          target_trip: mutation.tripId,
          changes: mutation.changes.map((c) => ({
            id: c.id,
            expected: c.expected,
            kind: c.record.kind,
            owner_id: c.record.ownerId,
            visibility: c.record.visibility,
            deleted: c.record.deleted,
            data: c.record.data,
          })),
        });
        if (error) {
          if (error.message.includes("CONFLICT")) throw new ConflictError();
          throw new Error(
            error.message.includes("ACCESS")
              ? "Você não tem permissão para alterar este item."
              : error.message,
          );
        }
      },
      subscribe(tripId, fn) {
        const sub = backendClient!
          .channel(`travel:${tripId}:${crypto.randomUUID()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "travel_records",
              filter: `trip_id=eq.${tripId}`,
            },
            fn,
          )
          .subscribe();
        return () => {
          void backendClient!.removeChannel(sub);
        };
      },
    };
