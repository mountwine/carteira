import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useTravel } from "../../data/TravelContext";
import { daysOf, ofKind, dateLabel, type Entity } from "../../domain/entities";
import { ordered, conflicts, travelEstimate } from "../../domain/planning";
import {
  Page,
  AddButton,
  RecordEditor,
  RecordActions,
  Empty,
  Modal,
} from "../../components/forms";
import { Card } from "../../components/ui";
import { NavigateButton } from "../LocalSettings";
export function Itinerary() {
  const consumed = useRef(new Set<string>());
  const positioned = useRef(false),
    timeline = useRef<HTMLDivElement>(null);
  const t = useTravel(),
    dates = daysOf(t.trip),
    key = `travel-os:last-day:${t.trip.id}`;
  const initial =
    ofKind(t.records, "activity").find((a) => a.id === t.focus)?.data.date ??
    (dates.includes(t.date) ? t.date : localStorage.getItem(key) || dates[0]);
  const [date, setDate] = useState(
      dates.includes(initial) ? initial : dates[0],
    ),
    [editing, setEditing] = useState<Entity<"activity"> | null | undefined>(
      t.focus === "new" ? null : undefined,
    ),
    [moving, setMoving] = useState<Entity<"activity"> | null>(null),
    [newDate, setNewDate] = useState(date),
    [dayEditor, setDayEditor] = useState(false);
  const activities = ordered(
      ofKind(t.records, "activity").filter((a) => a.data.date === date),
    ),
    day = ofKind(t.records, "day").find((d) => d.data.date === date),
    alerts = conflicts(activities);
  useEffect(() => {
    if (t.activeScreen !== "Roteiro") return;
    if (t.focus.startsWith("new") && !consumed.current.has(t.focus)) {
      consumed.current.add(t.focus);
      setEditing(null);
    }
    const target = ofKind(t.records, "activity").find((a) => a.id === t.focus);
    if (target) {
      setDate(target.data.date);
      setEditing(target);
    }
  }, [t.focus, t.activeScreen]);
  useEffect(() => {
    localStorage.setItem(key, date);
  }, [date, key]);
  useEffect(() => {
    if (
      positioned.current ||
      t.engine.loading ||
      t.activeScreen !== "Roteiro" ||
      date !== t.date ||
      t.focus ||
      !activities.length
    )
      return;
    positioned.current = true;
    const zone = t.trip.destinations.find(
      (d) => date >= d.startDate && date <= d.endDate,
    )?.timezone;
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
    const next = activities.find(
      (a) => a.data.time >= time && a.data.status !== "done",
    );
    if (next)
      requestAnimationFrame(() =>
        timeline.current
          ?.querySelector(`[data-activity-id="${next.id}"]`)
          ?.scrollIntoView({ block: "center" }),
      );
  }, [t.engine.loading, t.activeScreen, date, t.focus, activities.length]);
  return (
    <Page
      title="Roteiro"
      action={
        <AddButton
          label="Adicionar atividade"
          onClick={() => setEditing(null)}
        />
      }
    >
      <div className="day-strip">
        {dates.map((d) => (
          <button key={d} aria-pressed={date === d} onClick={() => setDate(d)}>
            <small>
              {new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", {
                weekday: "short",
                timeZone: "UTC",
              })}
            </small>
            <strong>{Number(d.slice(8))}</strong>
            <span>{d.slice(5, 7)}</span>
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>{dateLabel(date)}</h2>
        <button className="text-button" onClick={() => setDayEditor(true)}>
          {day?.data.intensity === "light"
            ? "Leve"
            : day?.data.intensity === "intense"
              ? "Intenso"
              : "Equilibrado"}
        </button>
      </div>
      {alerts.length > 0 && (
        <div className="warning-list" role="status">
          {alerts.map((a) => (
            <p key={a.id}>{a.text}</p>
          ))}
        </div>
      )}
      {!activities.length ? (
        <Empty
          title="Roteiro vazio"
          text="Nenhuma atividade para este dia."
          action={
            <button className="button primary" onClick={() => setEditing(null)}>
              + Adicionar atividade
            </button>
          }
        />
      ) : (
        <div ref={timeline} className="timeline">
          {activities.map((a, i) => {
            const estimate = i
              ? travelEstimate(activities[i - 1].data, a.data)
              : null;
            return (
              <article key={a.id} data-activity-id={a.id}>
                {estimate && (
                  <p className="travel-block">
                    {estimate.km} km · ~{estimate.minutes} min de carro ·
                    estimado
                  </p>
                )}
                <div className="timeline-label">
                  <strong>{a.data.time || "Definir horário"}</strong>
                  {a.data.fixed && <span className="fixed-badge">Fixo</span>}
                </div>
                <Card
                  className={`itinerary-activity-card ${a.data.status === "done" ? "activity-done" : ""}`}
                >
                  <div className="itinerary-activity-main">
                    <span className="itinerary-activity-icon">
                      <MapPin size={23} />
                    </span>
                    <div>
                      <h3>{a.data.title}</h3>
                      <p>
                        <MapPin size={14} /> {a.data.address || "Revisar local"}
                      </p>
                    </div>
                  </div>
                  {a.data.needsTime && (
                    <p className="warning">
                      Atividade anterior sem horário. Edite para completar.
                    </p>
                  )}
                  {a.data.notes && <p>{a.data.notes}</p>}
                  <div className="action-row itinerary-primary-actions">
                    <NavigateButton
                      address={a.data.address}
                      lat={a.data.lat}
                      lng={a.data.lng}
                    />
                    <button
                      className="text-button"
                      onClick={() => {
                        void t
                          .save({
                            ...a,
                            data: {
                              ...a.data,
                              status:
                                a.data.status === "done" ? "planned" : "done",
                            },
                          })
                          .catch((e) => t.notify(e.message));
                      }}
                    >
                      {a.data.status === "done" ? "Reabrir" : "Concluir"}
                    </button>
                  </div>
                  <RecordActions
                    record={a}
                    onEdit={() => setEditing(a)}
                    extra={
                      <>
                        <button
                          className="text-button"
                          onClick={() => {
                            void t
                              .save(
                                t.make("activity", {
                                  ...a.data,
                                  title: `${a.data.title} (cópia)`,
                                  reservationId: "",
                                }),
                              )
                              .catch((e) => t.notify(e.message));
                          }}
                        >
                          Duplicar
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            setMoving(a);
                            setNewDate(date);
                          }}
                        >
                          Mover dia
                        </button>
                      </>
                    }
                  />
                  {a.data.reservationId && (
                    <button
                      className="text-button"
                      onClick={() =>
                        t.navigate("Reservas", a.data.reservationId)
                      }
                    >
                      Ver reserva vinculada
                    </button>
                  )}
                </Card>
              </article>
            );
          })}
        </div>
      )}
      {editing !== undefined && (
        <RecordEditor
          kind="activity"
          record={editing ?? undefined}
          initial={{ date }}
          onClose={() => setEditing(undefined)}
        />
      )}{" "}
      {dayEditor && (
        <RecordEditor
          kind="day"
          record={day}
          initial={day ? {} : { title: `Dia ${dateLabel(date)}`, date }}
          onClose={() => setDayEditor(false)}
        />
      )}{" "}
      {moving && (
        <Modal title="Mover atividade" onClose={() => setMoving(null)}>
          <label>
            Dia
            <select
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {dateLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            onClick={() => {
              void t
                .save({ ...moving, data: { ...moving.data, date: newDate } })
                .then(() => {
                  setMoving(null);
                  setDate(newDate);
                })
                .catch((e) => t.notify(e.message));
            }}
          >
            Mover atividade
          </button>
        </Modal>
      )}
    </Page>
  );
}
