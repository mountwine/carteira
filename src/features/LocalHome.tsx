import { useEffect, useState } from "react";
import { useTravel } from "../data/TravelContext";
import { homeContext } from "../domain/models";
import { ofKind, change, money, type Entity } from "../domain/entities";
import { checklistForPhase, ordered } from "../domain/planning";
import { TripPass } from "./TripPass";
import { ProgressBar } from "../components/local";
import { RecordEditor, RecordActions, Page, Modal } from "../components/forms";
import { subscribeToPhotos, type Photo } from "../data/media";
import { weatherForecast, type WeatherForecast } from "../adapters/external";
import {
  CalendarDays,
  CloudSun,
  Wallet,
  BriefcaseBusiness,
  Camera,
} from "lucide-react";
export function InlineChecklist({
  packing = false,
  returning = false,
}: {
  packing?: boolean;
  returning?: boolean;
}) {
  const t = useTravel(),
    [expanded, setExpanded] = useState(false),
    [adding, setAdding] = useState(false),
    [title, setTitle] = useState(""),
    [editing, setEditing] = useState<
      Entity<"checklist"> | Entity<"packing"> | null
    >(null);
  const lifecycle = homeContext(t.trip, new Date());
  const allItems = packing
    ? ofKind(t.records, "packing")
    : checklistForPhase(
        ofKind(t.records, "checklist"),
        lifecycle.phase,
        lifecycle.totalDays - lifecycle.day,
      );
  const done = (r: (typeof allItems)[number]) =>
    r.kind === "packing"
      ? returning
        ? r.data.returnPacked
        : r.data.packed
      : r.data.done;
  const items = [...allItems].sort((a, b) => Number(done(a)) - Number(done(b)));
  const count = items.filter(done).length,
    percent = items.length ? Math.round((count / items.length) * 100) : 0;
  const days = homeContext(t.trip, new Date()).daysUntil;
  const urgent =
    !packing && percent < 100
      ? days < 7
        ? "priority"
        : days <= 14
          ? "attention"
          : days <= 30
            ? "subtle"
            : ""
      : "";
  return (
    <section className={`card inline-checklist ${urgent}`}>
      <div className="section-heading">
        <h2>{packing ? "🧳 Bagagem" : "✓ Checklist"}</h2>
        <strong>{percent}%</strong>
      </div>
      <ProgressBar value={percent} />
      <p>
        {percent === 100 && items.length
          ? "Tudo pronto para viajar"
          : `${count} de ${items.length} ${packing ? "itens preparados" : "concluídos"}`}
      </p>
      {(expanded ? items : items.slice(0, 3)).map((r) => (
        <div key={r.id} className="inline-item">
          <button
            className="check-circle"
            aria-label={`${done(r) ? "Desmarcar" : "Marcar"} ${r.data.title}`}
            aria-pressed={done(r)}
            onClick={() => {
              const record =
                r.kind === "packing"
                  ? {
                      ...r,
                      data: {
                        ...r.data,
                        [returning ? "returnPacked" : "packed"]: !done(r),
                      },
                    }
                  : { ...r, data: { ...r.data, done: !done(r) } };
              void t.save(record).catch((e) => t.notify(e.message));
            }}
          >
            {done(r) ? "✓" : "○"}
          </button>
          <span>
            {r.data.title}
            {r.kind === "packing" && r.data.quantity > 1
              ? ` ×${r.data.quantity}`
              : ""}
          </span>
          <details>
            <summary aria-label={`Opções de ${r.data.title}`}>•••</summary>
            <RecordActions record={r} onEdit={() => setEditing(r)} />
          </details>
        </div>
      ))}
      <div className="section-heading">
        {items.length > 3 && (
          <button
            className="text-button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Mostrar menos ↑" : "Mostrar mais ↓"}
          </button>
        )}
        <button className="text-button" onClick={() => setAdding(true)}>
          + Adicionar item
        </button>
      </div>
      {adding && (
        <form
          className="inline-add"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            try {
              const record = packing
                ? t.make("packing", {
                    title: title.trim(),
                    bagId: ofKind(t.records, "bag")[0]?.id ?? "",
                    traveler: t.user.id,
                    category: "Outros",
                    weight: 0,
                    quantity: 1,
                    packed: false,
                    returnPacked: false,
                    shoppingId: "",
                  })
                : t.make("checklist", {
                    title: title.trim(),
                    phase: "before",
                    due: "",
                    assignee: t.user.id,
                    done: false,
                    suggested: false,
                  });
              await t.save(record);
              setTitle("");
              setAdding(false);
            } catch (err) {
              t.notify((err as Error).message);
            }
          }}
        >
          <label>
            Novo item
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <button className="button primary" disabled={!title.trim()}>
            Adicionar
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setAdding(false)}
          >
            Cancelar
          </button>
        </form>
      )}
      {editing && (
        <RecordEditor
          kind={editing.kind}
          record={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
export function LocalHome() {
  const t = useTravel(),
    ctx = homeContext(t.trip, new Date()),
    [forecast, setForecast] = useState<WeatherForecast | null>(null),
    [forecastOpen, setForecastOpen] = useState(false),
    [weatherError, setWeatherError] = useState(""),
    [album, setAlbum] = useState<Photo[]>([]);
  const activities = ordered(
    ofKind(t.records, "activity").filter((a) => a.data.date === ctx.date),
  );
  const zone =
    ctx.destination?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const next = activities.find(
    (a) => a.data.status !== "done" && a.data.time >= time,
  );
  const currentActivity =
    next ??
    [...activities]
      .reverse()
      .find((a) => a.data.time <= time && a.data.location?.city) ??
    activities[0];
  const city =
    currentActivity?.data.location?.city ||
    ctx.destination?.city ||
    t.trip.destinations[0]?.city ||
    "";
  const latitude = currentActivity?.data.lat ?? ctx.destination?.place?.lat,
    longitude = currentActivity?.data.lng ?? ctx.destination?.place?.lng;
  useEffect(() => {
    setForecast(null);
    setWeatherError("");
    if (ctx.phase !== "during" || t.activeScreen !== "Hoje") return;
    if (latitude == null || longitude == null) {
      setWeatherError(
        "Selecione um local com coordenadas para consultar a previsão.",
      );
      return;
    }
    const controller = new AbortController();
    void weatherForecast(latitude, longitude, controller.signal)
      .then(setForecast)
      .catch((e) => {
        if (!controller.signal.aborted) setWeatherError(e.message);
      });
    return () => controller.abort();
  }, [latitude, longitude, ctx.phase, t.activeScreen]);
  useEffect(() => {
    return subscribeToPhotos(t.trip.id, setAlbum);
  }, [t.trip.id]);
  const bought = ofKind(t.records, "shopping").filter((s) => s.data.bought),
    expenses = ofKind(t.records, "expense"),
    todayExpenses = expenses.filter((e) => e.data.date === ctx.date),
    reservations = ofKind(t.records, "reservation").filter(
      (r) => r.data.date === ctx.date && r.data.status !== "cancelled",
    );
  const spent = expenses.reduce((n, e) => n + e.data.amount * e.data.rate, 0),
    spentToday = todayExpenses.reduce(
      (n, e) => n + e.data.amount * e.data.rate,
      0,
    );
  return (
    <main className="module-page local-home" data-phase={ctx.phase}>
      <TripPass
        trip={t.trip}
        ctx={ctx}
        next={next}
        doneCount={
          ofKind(t.records, "activity").filter((a) => a.data.status === "done")
            .length
        }
      />
      {ctx.phase === "before" ? (
        <>
          <div className="home-section-title">
            <div>
              <span className="eyebrow">ANTES DE PARTIR</span>
              <h2>Prepare sua viagem</h2>
            </div>
          </div>
          <InlineChecklist />
          <InlineChecklist packing />
        </>
      ) : ctx.phase === "during" ? (
        <>
          <section className="card compact-forecast">
            <div className="home-card-heading">
              <CloudSun size={21} />
              <h2>Previsão</h2>
            </div>
            {forecast ? (
              <>
                <p>
                  {forecast.days[0]?.min}° / {forecast.days[0]?.max}° · Chuva{" "}
                  {forecast.days[0]?.rain}%
                </p>
                <p>Pôr do sol {forecast.days[0]?.sunset}</p>
                <small>
                  Open-Meteo ·{" "}
                  {forecast.cached ? "Última atualização" : "Atualização"}:{" "}
                  {new Date(forecast.at).toLocaleString("pt-BR")}
                </small>
                <button
                  className="text-button"
                  onClick={() => setForecastOpen(true)}
                >
                  Ver previsão de 7 dias
                </button>
              </>
            ) : (
              <p>{weatherError || "Carregando previsão…"}</p>
            )}
          </section>
          <section className="card">
            <div className="section-heading">
              <div className="home-card-heading">
                <Wallet size={21} />
                <h2>Gastos hoje</h2>
              </div>
              <button
                aria-label="Adicionar gasto"
                className="add-button"
                onClick={() => t.navigate("Gastos", "new")}
              >
                +
              </button>
            </div>
            <strong className="large-number">{money(spentToday, "USD")}</strong>
            <p>{todayExpenses.length} gasto(s) · taxas registradas</p>
          </section>
          {reservations.length > 0 && (
            <section className="card">
              <div className="home-card-heading">
                <CalendarDays size={21} />
                <h2>Reservas de hoje</h2>
              </div>
              {reservations.map((r) => (
                <button
                  className="menu-row"
                  key={r.id}
                  onClick={() => t.navigate("Reservas", r.id)}
                >
                  {r.data.time} · {r.data.title}
                </button>
              ))}
            </section>
          )}
          {ctx.totalDays - ctx.day <= 2 && (
            <section className="card">
              <div className="home-card-heading">
                <BriefcaseBusiness size={21} />
                <h2>Hora de fazer as malas</h2>
              </div>
              <p>Não esqueça nada.</p>
              <button
                className="button secondary"
                onClick={() => t.navigate("Bagagem", "return")}
              >
                Organizar retorno
              </button>
            </section>
          )}
          <InlineChecklist />
        </>
      ) : (
        <>
          <div className="home-section-title">
            <div>
              <span className="eyebrow">DEPOIS DA VIAGEM</span>
              <h2>Sua retrospectiva</h2>
            </div>
            <button className="text-button" onClick={() => t.navigate("Álbum")}>
              <Camera size={17} /> Álbum
            </button>
          </div>
          <section className="card">
            <h2>Retrospectiva</h2>
            <p>
              {ctx.totalDays} dias · {t.trip.destinations.length} destinos
            </p>
            <div className="stats-grid">
              <div>
                <strong>
                  {
                    ofKind(t.records, "activity").filter(
                      (a) => a.data.status === "done",
                    ).length
                  }
                </strong>
                <small>lugares visitados</small>
              </div>
              <div>
                <strong>{album.length}</strong>
                <small>fotos</small>
              </div>
            </div>
            <button
              className="button secondary"
              onClick={() => t.navigate("Álbum")}
            >
              Ver álbum
            </button>
          </section>
          <section className="card">
            <h2>Gastos da viagem</h2>
            <strong>{money(spent, "USD")}</strong>
            <button
              className="text-button"
              onClick={() => t.navigate("Gastos")}
            >
              Ver gastos
            </button>
          </section>
          <section className="card">
            <h2>Compras da viagem</h2>
            <p>
              {bought.length} item(ns) ·{" "}
              {money(
                expenses
                  .filter((e) => e.data.category === "Compras")
                  .reduce((n, e) => n + e.data.amount * e.data.rate, 0),
                "USD",
              )}
            </p>
            {bought.slice(0, 3).map((s) => (
              <p key={s.id}>{s.data.title}</p>
            ))}
            <button
              className="text-button"
              onClick={() => t.navigate("Compras")}
            >
              Ver compras
            </button>
          </section>
          {ofKind(t.records, "memory").map((m) => (
            <section className="card" key={m.id}>
              <h3>
                {m.data.title}
                {m.data.favorite ? " · ★" : ""}
              </h3>
              <small>{m.data.date}</small>
              <p>{m.data.notes}</p>
            </section>
          ))}
        </>
      )}
      {forecastOpen && forecast && (
        <Modal
          title="Previsão de 7 dias"
          onClose={() => setForecastOpen(false)}
        >
          {forecast.days.map((d) => (
            <section className="card" key={d.date}>
              <h3>
                {new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </h3>
              <p>
                {d.min}° / {d.max}° · Chuva {d.rain}%
              </p>
              <small>Pôr do sol {d.sunset}</small>
            </section>
          ))}
        </Modal>
      )}
    </main>
  );
}
