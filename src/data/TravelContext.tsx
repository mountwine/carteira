import { currentRate } from "../adapters/external";
import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { TravelEngine, message } from "./engine";
import type { Trip, User } from "../domain/models";
import {
  type AnyEntity,
  type Change,
  type Entity,
  type EntityMap,
  type Kind,
  change,
  ofKind,
  entity,
} from "../domain/entities";
import { cachePreferences } from "../adapters/preferences";
import { reservationChanges, purchaseChanges } from "../domain/planning";
import { Button, Card } from "../components/ui";
import { Context, useTravel, type Screen, type TravelValue } from "./context";
export { useTravel } from "./context";
export type { Screen } from "./context";
export function TravelProvider({
  trip,
  user,
  date,
  navigate,
  focus,
  children,
  backLabel,
  activeScreen,
  back,
}: {
  trip: Trip;
  user: User;
  date: string;
  navigate: TravelValue["navigate"];
  focus: string;
  children: ReactNode;
  backLabel: string;
  activeScreen: Screen;
  back: () => void;
}) {
  const engine = useMemo(
    () => new TravelEngine(trip, user),
    [trip.id, user.id],
  );
  const [, render] = useReducer((n) => n + 1, 0);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const off = engine.subscribe(render);
    void engine.start();
    return () => {
      off();
      engine.dispose();
    };
  }, [engine]);
  useEffect(() => {
    engine.trip = trip;
  }, [trip, engine]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timeout);
  }, [toast]);
  async function commit(changes: Change[], label: string) {
    await engine.mutate(changes, label);
    setToast(label);
  }
  async function save(record: AnyEntity) {
    const changes = [change(record)];
    if (record.kind === "shopping" && record.data.bought) {
      const existing = ofKind(engine.records, "expense").find(
        (e) => e.data.shoppingId === record.id,
      );
      const rate =
        existing && existing.data.currency === record.data.currency
          ? existing.data.rate
          : (await currentRate(record.data.currency, "USD")).rate;
      changes.splice(
        0,
        changes.length,
        ...purchaseChanges(
          record,
          record.data.actualPrice,
          true,
          record.data.currency,
          rate,
          existing?.data.date ?? date,
          engine.records,
          trip,
          user,
        ),
      );
    }
    if (record.kind === "reservation")
      changes.push(...reservationChanges(record, engine.records, trip, user));
    if (record.kind === "memory")
      for (const doc of ofKind(engine.records, "document").filter(
        (d) =>
          record.data.photoIds.includes(d.id) &&
          d.ownerId === user.id &&
          d.visibility !== record.visibility,
      ))
        changes.push(change({ ...doc, visibility: record.visibility }));
    await commit(changes, "Alterações salvas");
    if (record.kind === "profile") cachePreferences(user.id, record.data);
  }
  async function drop(record: AnyEntity) {
    const changes = [change({ ...record, deleted: true } as AnyEntity)];
    if (record.kind === "reservation")
      changes.push(
        ...reservationChanges(
          { ...record, deleted: true },
          engine.records,
          trip,
          user,
        ),
      );
    if (record.kind === "shopping") {
      for (const e of ofKind(engine.records, "expense").filter(
        (e) => e.data.shoppingId === record.id,
      ))
        changes.push(change({ ...e, deleted: true }));
    }
    if (record.kind === "bag")
      for (const item of ofKind(engine.records, "packing").filter(
        (p) => p.data.bagId === record.id,
      ))
        changes.push(change({ ...item, data: { ...item.data, bagId: "" } }));
    if (record.kind === "bag")
      for (const item of ofKind(engine.records, "shopping").filter(
        (p) => p.data.bagId === record.id,
      ))
        changes.push(change({ ...item, data: { ...item.data, bagId: "" } }));
    await commit(changes, "Item excluído");
  }
  const value = {
    engine,
    trip,
    user,
    date,
    navigate,
    focus,
    backLabel,
    activeScreen,
    back,
    records: engine.records,
    notify: setToast,
    commit,
    save,
    drop,
    make: <K extends Kind>(
      kind: K,
      data: EntityMap[K],
      visibility: "trip" | "private" = "trip",
    ) => entity(kind, data, trip, user, visibility),
  };
  return (
    <Context.Provider value={value}>
      {engine.loading ? (
        <p className="loading" role="status">
          Preparando sua viagem…
        </p>
      ) : (
        <>
          {(engine.pending.some((p) => p.status !== "queued") ||
            engine.error) && (
            <div className="sync-strip" role="status">
              <span>
                {!navigator.onLine
                  ? "Offline · última versão salva"
                  : engine.pending.length
                    ? `${engine.pending.length} alteração(ões) ${engine.pending.some((p) => p.status !== "queued") ? "precisam de revisão" : "aguardando gravação local"}`
                    : engine.error}
              </span>
              <button onClick={() => navigate("Sincronização")}>
                Ver detalhes
              </button>
            </div>
          )}
          {children}
        </>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          {engine.undoChanges.length > 0 && (
            <button
              onClick={() => {
                void engine
                  .undo()
                  .then(() => setToast("Ação desfeita"))
                  .catch((e) => setToast(message(e)));
              }}
            >
              Desfazer
            </button>
          )}
          <button aria-label="Fechar feedback" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function SyncScreen() {
  const { engine, notify } = useTravel();
  return (
    <div className="module-page">
      <h1>Revisar alterações locais</h1>
      <p>
        {navigator.onLine ? "Conectado" : "Offline"} · Última leitura local:{" "}
        {engine.at
          ? new Date(engine.at).toLocaleString("pt-BR")
          : "ainda não realizada"}
      </p>
      <Button
        disabled={engine.busy}
        onClick={() => {
          void engine.sync();
        }}
      >
        Tentar salvar novamente
      </Button>
      {!engine.pending.length && (
        <Card>
          <h2>Tudo em dia</h2>
          <p>Suas alterações foram salvas.</p>
        </Card>
      )}
      {engine.pending.map((p) => (
        <Card key={p.mutation.id}>
          <h2>{p.mutation.label}</h2>
          <p>{p.error ?? "Aguardando gravação local."}</p>
          {p.mutation.changes.map((c) => (
            <div key={c.id} className="conflict-details">
              <strong>{c.record.data.title}</strong>
              <p>
                Sua versão:{" "}
                {Object.entries(c.record.data)
                  .filter(
                    ([, v]) => typeof v === "string" || typeof v === "number",
                  )
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </p>
              <p>
                Versão salva neste dispositivo:{" "}
                {JSON.stringify(
                  engine.base.find((r) => r.id === c.id)?.data ?? "Item novo",
                )}
              </p>
            </div>
          ))}
          {p.status !== "queued" && (
            <div className="action-row">
              <Button
                variant="secondary"
                onClick={() => {
                  void engine
                    .resolve(p.mutation.id, "discard")
                    .catch((e) => notify(message(e)));
                }}
              >
                Descartar minha alteração
              </Button>
              <Button
                onClick={() => {
                  void engine
                    .resolve(p.mutation.id, "retry")
                    .catch((e) => notify(message(e)));
                }}
              >
                Reaplicar minha versão
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
