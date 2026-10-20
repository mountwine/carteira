import type { ReactNode } from "react";
import type { Trip, User } from "../domain/models";
import { homeContext } from "../domain/models";
import { TripCover } from "../components/MediaImage";
import { MapPin, Pencil, UsersRound } from "lucide-react";
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
function tripDates(t: Trip) {
  const format = (value: string, year: boolean) =>
    new Date(`${value}T12:00:00`)
      .toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        ...(year ? { year: "numeric" } : {}),
      })
      .replace(/\./g, "");
  const sameYear = t.startDate.slice(0, 4) === t.endDate.slice(0, 4);
  return `${format(t.startDate, !sameYear)} – ${format(t.endDate, true)}`;
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
  const now = new Date();
  const sorted = sortedTrips(trips, now);
  return (
    <main className="module-page trip-list">
      <header className="module-heading">
        <h1>Minhas viagens</h1>
        <span className="trip-count">
          {trips.length} {trips.length === 1 ? "viagem" : "viagens"}
        </span>
      </header>
      {actions}
      {!trips.length && (
        <section className="empty-state">
          <h2>Nenhuma viagem</h2>
          <p>
            Comece criando uma viagem para organizar seus planos em um só lugar.
          </p>
        </section>
      )}
      {(["during", "before", "after"] as const).map((phase) => {
        const list = sorted.filter((t) => homeContext(t, now).phase === phase);
        return list.length ? (
          <section className="trip-group" key={phase}>
            <h2 className="eyebrow">
              {phase === "during"
                ? "Em andamento"
                : phase === "before"
                  ? "Próximas"
                  : "Anteriores"}
            </h2>
            <div className="trip-cards">
              {list.map((t) => {
                const c = homeContext(t, now);
                return (
                  <article className="compact-trip trip-card" key={t.id}>
                    <button
                      className="trip-open"
                      onClick={() => open(t)}
                      aria-label={`Abrir viagem ${t.name}`}
                    >
                      <span
                        className={`trip-thumb ${t.cover ? "has-cover" : ""}`}
                      >
                        {t.cover ? (
                          <TripCover
                            cover={t.cover}
                            position={t.coverPosition}
                          />
                        ) : (
                          <MapPin size={26} aria-hidden="true" />
                        )}
                      </span>
                      <span className="trip-summary">
                        <strong className="trip-name">{t.name}</strong>
                        <span className="trip-dates">{tripDates(t)}</span>
                        <span className="trip-members">
                          <UsersRound size={13} aria-hidden="true" />
                          {t.members.length}{" "}
                          {t.members.length === 1 ? "viajante" : "viajantes"}
                        </span>
                        <span className="trip-status">
                          {c.phase === "during"
                            ? `Dia ${c.day}`
                            : c.phase === "before"
                              ? `Faltam ${c.daysUntil} ${c.daysUntil === 1 ? "dia" : "dias"}`
                              : tripPeriod(t)}
                        </span>
                      </span>
                    </button>
                    <button
                      className="icon-button trip-edit"
                      aria-label={`Editar ${t.name}`}
                      onClick={() => edit(t)}
                    >
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null;
      })}
    </main>
  );
}
