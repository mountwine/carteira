import type { Trip, User } from "../domain/models";
import {
  type AnyEntity,
  type Change,
  type Mutation,
  type Pending,
  ConflictError,
  validateRecord,
  entity,
  change,
} from "../domain/entities";
import { optimistic } from "../domain/mutations";
import { get, put, remove, all } from "./database";
import { repository } from "./repository";
import { isDemo } from "../adapters";
interface Snapshot {
  id: string;
  records: AnyEntity[];
  at: string;
}
export class TravelEngine {
  base: AnyEntity[] = [];
  pending: Pending[] = [];
  loading = true;
  error = "";
  at = "";
  busy = false;
  private listeners = new Set<() => void>();
  private disposed = false;
  private generation = 0;
  private writes: Promise<unknown> = Promise.resolve();
  private off = () => {};
  private timer: ReturnType<typeof setInterval> | undefined;
  private flushing: Promise<void> | null = null;
  undoChanges: Change[] = [];
  constructor(
    public trip: Trip,
    public user: User,
  ) {}
  get scope() {
    return `${this.user.id}:${this.trip.id}`;
  }
  get records() {
    return optimistic(this.base, this.pending);
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  emit() {
    if (!this.disposed) this.listeners.forEach((fn) => fn());
  }
  async start() {
    this.disposed = false;
    const generation = ++this.generation;
    try {
      const cache = await get<Snapshot>("cache", this.scope);
      this.base = cache?.records ?? [];
      this.at = cache?.at ?? "";
      const legacy = await get<{ id: string; items: Pending[] }>(
        "pending",
        this.scope,
      );
      if (legacy?.items) {
        for (const item of legacy.items) await this.persistItem(item);
        await remove("pending", this.scope);
      }
      this.pending = await this.readQueue();
      if (generation !== this.generation || this.disposed) return;
      this.loading = false;
      this.emit();
      await this.refresh();
      await this.sync();
      if (generation !== this.generation || this.disposed) return;
      this.off = repository.subscribe(this.trip.id, () => {
        void this.refresh();
      });
      this.timer = setInterval(() => {
        void this.sync();
      }, 30000);
      window.addEventListener("online", this.online);
      window.addEventListener("focus", this.online);
    } catch (e) {
      this.error = message(e);
    } finally {
      this.loading = false;
      this.emit();
    }
  }
  online = () => {
    void this.sync();
  };
  private queueKey(id: string) {
    return `${this.scope}:${id}`;
  }
  private async persistItem(item: Pending) {
    if (await get("receipts", `queue:${item.mutation.id}`)) return;
    await put("pending", {
      id: this.queueKey(item.mutation.id),
      scope: this.scope,
      item,
    });
  }
  private async readQueue() {
    return (await all<{ scope?: string; item?: Pending }>("pending"))
      .filter((r) => r.scope === this.scope && r.item)
      .map((r) => r.item!)
      .sort((a, b) => a.mutation.at.localeCompare(b.mutation.at));
  }
  async persistQueue() {
    for (const item of this.pending) await this.persistItem(item);
  }
  private async retire(id: string) {
    await put("receipts", { id: `queue:${id}` });
    await remove("pending", this.queueKey(id));
  }
  async refresh() {
    if (!navigator.onLine && !isDemo) return;
    try {
      const rows = await repository.list(this.trip, this.user);
      this.base = rows;
      const allowedFiles = new Set(
        rows
          .filter((r) => r.kind === "document" && !r.deleted)
          .map((r) =>
            r.kind === "document"
              ? `${this.scope}:${r.data.filePath || r.id}`
              : "",
          ),
      );
      for (const file of await all<{ id: string }>("files"))
        if (
          file.id.startsWith(this.scope + ":") &&
          !allowedFiles.has(file.id) &&
          !this.pending.some((p) =>
            p.mutation.changes.some(
              (c) =>
                c.record.kind === "document" &&
                file.id.endsWith(c.record.data.filePath),
            ),
          )
        )
          await remove("files", file.id);
      this.at = new Date().toISOString();
      this.error = "";
      await put("cache", { id: this.scope, records: rows, at: this.at });
      this.emit();
    } catch (e) {
      this.error = navigator.onLine
        ? message(e)
        : "Você está usando a última versão armazenada.";
      this.emit();
    }
  }
  mutate(changes: Change[], label: string) {
    const task = this.writes.then(() => this.writeMutation(changes, label));
    this.writes = task.catch(() => {});
    return task;
  }
  private async writeMutation(changes: Change[], label: string) {
    if (!changes.length) return;
    for (const c of changes)
      if (!c.record.deleted) validateRecord(c.record, this.trip);
    const current = this.records;
    for (const c of changes) {
      const old = current.find((r) => r.id === c.id);
      if ((old?.version ?? null) !== c.expected) throw new ConflictError();
    }
    const mutation: Mutation = {
      id: crypto.randomUUID(),
      tripId: this.trip.id,
      userId: this.user.id,
      at: new Date().toISOString(),
      label,
      changes,
    };
    const next = [...this.pending, { mutation, status: "queued" as const }];
    this.pending = next;
    try {
      await this.persistItem(
        this.pending.find((p) => p.mutation.id === mutation.id)!,
      );
    } catch (e) {
      this.pending = this.pending.filter((p) => p.mutation.id !== mutation.id);
      throw e;
    }
    this.undoChanges = changes.some((c) => c.record.kind === "profile")
      ? []
      : changes.map((c) => {
          const old = current.find((r) => r.id === c.id);
          return {
            id: c.id,
            expected: (c.expected ?? 0) + 1,
            record: old
              ? { ...old, version: (c.expected ?? 0) + 1 }
              : { ...c.record, deleted: true, version: 1 },
          } as Change;
        });
    this.emit();
    void this.sync();
  }
  async undo() {
    const changes = this.undoChanges;
    if (!changes.length) return;
    await this.mutate(changes, "Desfazer última ação");
    this.undoChanges = [];
    this.emit();
  }
  async sync() {
    if (this.flushing) return this.flushing;
    this.flushing = this.flush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }
  private async flush() {
    if (!navigator.onLine && !isDemo) return;
    const loaded = await this.readQueue();
    this.pending = [
      ...new Map(
        [...this.pending, ...loaded].map((p) => [p.mutation.id, p]),
      ).values(),
    ].sort((a, b) => a.mutation.at.localeCompare(b.mutation.at));
    this.busy = true;
    this.emit();
    try {
      while (this.pending.length) {
        const first = this.pending[0];
        if (first.status !== "queued") break;
        try {
          await repository.commit(first.mutation, this.trip, this.user);
          await this.refresh();
          this.pending = this.pending.filter(
            (p) => p.mutation.id !== first.mutation.id,
          );
          await this.retire(first.mutation.id);
          this.emit();
        } catch (e) {
          if (!isDemo && (!navigator.onLine || e instanceof TypeError)) {
            this.error =
              "Sem conexão com o servidor. Alterações preservadas neste dispositivo.";
            break;
          }
          first.status = e instanceof ConflictError ? "conflict" : "failed";
          first.error = message(e);
          await this.persistItem(first);
          await this.refresh();
          break;
        }
      }
      await this.refresh();
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  async resolve(id: string, action: "discard" | "retry") {
    await this.refresh();
    const item = this.pending.find((p) => p.mutation.id === id);
    if (!item) return;
    if (action === "discard") {
      const affected = new Set(item.mutation.changes.map((c) => c.id));
      this.pending = this.pending.filter((p) => p !== item);
      for (const p of this.pending)
        if (p.mutation.changes.some((c) => affected.has(c.id))) {
          p.status = "conflict";
          p.error =
            "Uma alteração anterior deste item foi descartada. Revise antes de reaplicar.";
        }
    } else {
      item.mutation = {
        ...item.mutation,
        id: crypto.randomUUID(),
        changes: item.mutation.changes.map((c) => {
          const remote = this.base.find((r) => r.id === c.id);
          if (!remote && c.expected !== null)
            throw new Error(
              "Este item não está mais disponível. Copie sua alteração e descarte a operação.",
            );
          return {
            ...c,
            expected: remote?.version ?? null,
            record: { ...c.record, ownerId: remote?.ownerId ?? this.user.id },
          };
        }),
      };
      item.status = "queued";
      delete item.error;
    }
    await this.retire(id);
    await this.persistQueue();
    this.emit();
    await this.sync();
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.off();
    clearInterval(this.timer);
    window.removeEventListener("online", this.online);
    window.removeEventListener("focus", this.online);
  }
}
export const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Não foi possível concluir. Seus dados locais foram preservados.";
export async function clearUserCache(userId: string) {
  for (const name of ["cache", "files"])
    for (const item of await all<{ id: string }>(name))
      if (item.id.startsWith(userId + ":")) await remove(name, item.id);
}
