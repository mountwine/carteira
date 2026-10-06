import type { ReactNode } from "react";
import type { Trip, User } from "../domain/models";
import { homeContext } from "../domain/models";
import { TripCover } from "../components/MediaImage";
export function tripPeriod(t: Trip) {
  const a = new Date(t.startDate + "T12:00:00"),
    b = new Date(t.endDate + "T12:00:00");
  const m = (d: Date) =>
    d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .toUpperCase();
  return a.getFullYear() !== b.getFullYear()
    ? `${m(a)} ${a.getFullYear()}–${m(b)} ${b.getFullYear()}`
    : a.getMonth() === b.getMonth()
      ? `${m(a)} ${a.getFullYear()}`
      : `${m(a)}–${m(b)} ${b.getFullYear()}`;
}
export function sortedTrips(trips: Trip[], now = new Date()) {
  return [...trips].sort((a, b) => {
    const x = homeContext(a, now).phase,
      y = homeContext(b, now).phase;
    const rank = { during: 0, before: 1, after: 2 };
    return (
      rank[x] - rank[y] ||
      (x === "after"
        ? b.endDate.localeCompare(a.endDate)
        : a.startDate.localeCompare(b.startDate))
    );
  });
}
export function Trips({
  trips,
  open,
  edit,
  actions,
}: {
  actions?: ReactNode;
  user: User;
  trips: Trip[];
  open: (t: Trip) => void;
  edit: (t: Trip) => void;
}) {
  const sorted = sortedTrips(trips);
  return (
    <main className="module-page trip-list">
      <header className="module-heading">
        <h1>Minhas viagens</h1>
        <span>
          {trips.length} {trips.length === 1 ? "viagem" : "viagens"}
        </span>
      </header>
      {actions}
      {!trips.length && (
        <section className="empty-state">
          <h2>Nenhuma viagem</h2>
          <p>Use Nova viagem para adicionar uma.</p>
        </section>
      )}
      {(["during", "before", "after"] as const).map((phase) => {
        const list = sorted.filter(
          (t) => homeContext(t, new Date()).phase === phase,
        );
        return list.length ? (
          <section key={phase}>
            <h2 className="eyebrow">
              {phase === "during"
                ? "Em andamento"
                : phase === "before"
                  ? "Próximas"
                  : "Anteriores"}
            </h2>
            {list.map((t) => {
              const c = homeContext(t, new Date());
              return (
                <article className="compact-trip card" key={t.id}>
                  <button className="trip-open" onClick={() => open(t)}>
                    <div className="trip-thumb">
                      <TripCover cover={t.cover} position={t.coverPosition} />
                    </div>
                    <div>
                      <h3>{t.name}</h3>
                      <small>
                        {t.startDate.split("-").reverse().join("/")} —{" "}
                        {t.endDate.split("-").reverse().join("/")}
                      </small>
                      <small>
                        {t.members.map((m) => m.displayName).join(" · ")}
                      </small>
                    </div>
                    <strong className="trip-status">
                      {c.phase === "during"
                        ? `DIA ${c.day}`
                        : c.phase === "before"
                          ? `${c.daysUntil} dias`
                          : tripPeriod(t)}
                    </strong>
                  </button>
                  <button
                    className="icon-button trip-edit"
                    aria-label={`Editar ${t.name}`}
                    onClick={() => edit(t)}
                  >
                    ✎
                  </button>
                </article>
              );
            })}
          </section>
        ) : null;
      })}
    </main>
  );
}
