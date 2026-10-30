import { useTravel } from "../data/TravelContext";
import type { Entity } from "../domain/entities";
import { homeHeadline } from "../domain/homeHeadline";
import type { HomeContext, Trip } from "../domain/models";
import { NavigateButton } from "./LocalSettings";

const shortDate = (date: string) =>
  new Date(date + "T12:00:00")
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(".", "");
const cityDays = (start: string, end: string) =>
  start === end ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}`;

/** Home hero: the trip as a boarding pass, headed by the city the traveler is in today. */
export function TripPass({
  trip,
  ctx,
  next,
  doneCount,
}: {
  trip: Trip;
  ctx: HomeContext;
  next?: Entity<"activity">;
  doneCount: number;
}) {
  const t = useTravel(),
    { city, tail } = homeHeadline(ctx, trip),
    status =
      ctx.phase === "before"
        ? "Em breve"
        : ctx.phase === "during"
          ? "Em viagem"
          : "Concluída",
    side =
      ctx.phase === "before"
        ? `${ctx.daysUntil} ${ctx.daysUntil === 1 ? "dia" : "dias"}`
        : ctx.phase === "during"
          ? `Dia ${ctx.day} / ${ctx.totalDays}`
          : "Encerrada";
  return (
    <section className="trip-pass" aria-label="Resumo da viagem">
      <h1 className="pass-title">
        {city},<br />
        <i>{tail}</i>
      </h1>
      <div className="pass-ticket">
        <div className="pass-head">
          <span>CARTÃO DE EMBARQUE</span>
          <span>{side}</span>
        </div>
        <div className="pass-body">
          {ctx.phase === "during" && next ? (
            <button
              type="button"
              className="pass-next"
              onClick={() => t.navigate("Roteiro", next.id)}
            >
              <span>
                <small>PRÓXIMA PARADA</small>
                <strong>{next.data.title}</strong>
                {next.data.address && <em>{next.data.address}</em>}
              </span>
              <span className="pass-time">
                <small>HORA</small>
                <strong>{next.data.time}</strong>
              </span>
            </button>
          ) : ctx.phase === "during" ? (
            <button
              type="button"
              className="pass-next"
              onClick={() => t.navigate("Roteiro")}
            >
              <span>
                <small>HOJE</small>
                <strong>Nada mais agendado</strong>
                <em>Toque para ver o roteiro</em>
              </span>
            </button>
          ) : ctx.phase === "before" ? (
            <button
              type="button"
              className="pass-next"
              onClick={() => t.navigate("Roteiro")}
            >
              <span>
                <small>COMEÇA EM</small>
                <strong>{shortDate(trip.startDate)}</strong>
              </span>
              <span className="pass-time">
                <small>FALTAM</small>
                <strong>{ctx.daysUntil}</strong>
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="pass-next"
              onClick={() => t.navigate("Álbum")}
            >
              <span>
                <small>RETROSPECTIVA</small>
                <strong>Reviva os momentos</strong>
                <em>
                  {ctx.totalDays} dias · {doneCount} lugares visitados
                </em>
              </span>
            </button>
          )}
          <dl className="pass-fields">
            <div>
              <dt>SAÍDA</dt>
              <dd>{shortDate(trip.startDate)}</dd>
            </div>
            <div>
              <dt>VOLTA</dt>
              <dd>{shortDate(trip.endDate)}</dd>
            </div>
            <div>
              <dt>STATUS</dt>
              <dd className="accent">{status}</dd>
            </div>
          </dl>
          {trip.destinations.length > 1 && (
            <ol className="pass-cities" aria-label="Cidades da viagem">
              {trip.destinations.map((d) => (
                <li
                  key={d.id}
                  aria-current={
                    d.id === ctx.destination?.id ? "step" : undefined
                  }
                >
                  <strong>{d.city}</strong>
                  <span>{cityDays(d.startDate, d.endDate)}</span>
                </li>
              ))}
            </ol>
          )}
          {ctx.phase === "during" && next && (
            <div className="pass-actions">
              <NavigateButton
                address={next.data.address}
                lat={next.data.lat}
                lng={next.data.lng}
              />
            </div>
          )}
        </div>
        <div className="pass-cut" aria-hidden="true" />
        <div className="pass-stub">
          <span>
            <small>VIAGEM</small>
            <strong>{trip.name}</strong>
          </span>
          <span className="pass-barcode" aria-hidden="true">
            {[3, 1.5, 4, 1.5, 2, 4, 1.5, 3].map((w, i) => (
              <i key={i} style={{ width: w }} />
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
