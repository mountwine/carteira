import { useState } from "react";
import type {
  Trip,
  User,
  PlaceData,
  Destination,
  TripMember,
} from "../domain/models";
import { persistTrip } from "../adapters/local";
import {
  ConfirmDiscard,
  PlaceAutocomplete,
  DatePicker,
  CurrencySelector,
} from "../components/local";
import { TripCover } from "../components/MediaImage";
import { importPhoto } from "../data/media";
import { all } from "../data/database";
import type { AnyEntity, Pending } from "../domain/entities";
import {
  buildEditedTrip,
  addDestinationWithDates,
  destinationScheduleError,
  newDestination,
  newTraveler,
} from "../domain/tripEditing";
export function TripEditor({
  user,
  trip,
  onClose,
  onSaved,
}: {
  user: User;
  trip?: Trip;
  onClose: () => void;
  onSaved: (id?: string) => Promise<void>;
}) {
  const [id] = useState(trip?.id ?? crypto.randomUUID());
  const [name, setName] = useState(trip?.name ?? ""),
    [origin, setOrigin] = useState<PlaceData>(trip?.origin ?? { name: "" }),
    [destinations, setDestinations] = useState<Destination[]>(
      () => trip?.destinations ?? [newDestination("", "")],
    ),
    [start, setStart] = useState(trip?.startDate ?? ""),
    [end, setEnd] = useState(trip?.endDate ?? ""),
    [cover, setCover] = useState(trip?.cover ?? ""),
    [position, setPosition] = useState(trip?.coverPosition ?? 50),
    [currency, setCurrency] = useState(trip?.currency ?? "USD"),
    [members, setMembers] = useState<TripMember[]>(
      () => trip?.members ?? [newTraveler(user.name, user.id)],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [deleting, setDeleting] = useState(false);
  const scheduleError = destinationScheduleError(destinations, start, end);
  const valid = !!(
    name.trim() &&
    origin.name.trim() &&
    start &&
    end &&
    end >= start &&
    destinations.length &&
    destinations.every((d) => d.city.trim()) &&
    !scheduleError &&
    members.every((m) => m.displayName.trim())
  );
  function touch() {
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    try {
      if (!valid)
        throw new Error("Preencha os campos obrigatórios e revise as datas.");
      const records = trip ? await all<AnyEntity>("records") : [];
      // Include durable pending changes when checking removal of a linked traveler.
      const pending = trip
        ? await all<{ item?: Pending; items?: Pending[] }>("pending")
        : [];
      const pendingRecords = pending.flatMap((row) =>
        (row.item ? [row.item] : (row.items ?? [])).flatMap((item) =>
          item.mutation.changes.map((c) => c.record),
        ),
      );
      if (trip) {
        const activities = records.filter(
          (r) => r.tripId === id && r.kind === "activity" && !r.deleted,
        );
        if (
          activities.some(
            (r) =>
              r.kind === "activity" &&
              (r.data.date < start || r.data.date > end),
          )
        )
          throw new Error(
            "Existem atividades fora do novo período. Ajuste suas datas no roteiro antes de reduzir a viagem.",
          );
      }
      const next = buildEditedTrip(
        trip,
        user,
        {
          id,
          name,
          origin,
          cover,
          coverPosition: position,
          startDate: start,
          endDate: end,
          currency,
          destinations,
          members,
        },
        [...records, ...pendingRecords],
      );
      persistTrip(next);
      await onSaved(id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ConfirmDiscard
      title={trip ? "Editar viagem" : "Nova viagem"}
      dirty={dirty}
      onClose={onClose}
    >
      <form
        className="record-form trip-editor-form"
        onChange={touch}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          Nome da viagem
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <PlaceAutocomplete
          label="Origem"
          value={origin}
          onChange={(p) => {
            setOrigin(p);
            touch();
          }}
        />
        {destinations.map((p, i) => (
          <div key={p.id} className="destination-field">
            <PlaceAutocomplete
              label={`Destino ${i + 1}`}
              value={p.place ?? { name: p.city, country: p.country }}
              onChange={(place) => {
                setDestinations((ds) =>
                  ds.map((d) =>
                    d.id === p.id
                      ? {
                          ...d,
                          city: place.name,
                          country: place.country ?? "",
                          place,
                        }
                      : d,
                  ),
                );
                touch();
              }}
            />
            {destinations.length > 1 && (
              <div className="destination-dates">
                <DatePicker
                  label="Chegada"
                  value={p.startDate}
                  min={start}
                  max={end}
                  onChange={(startDate) => {
                    setDestinations((ds) =>
                      ds.map((d) => (d.id === p.id ? { ...d, startDate } : d)),
                    );
                    touch();
                  }}
                />
                <DatePicker
                  label="Saída"
                  value={p.endDate}
                  min={p.startDate || start}
                  max={end}
                  onChange={(endDate) => {
                    setDestinations((ds) =>
                      ds.map((d) => (d.id === p.id ? { ...d, endDate } : d)),
                    );
                    touch();
                  }}
                />
              </div>
            )}
            <div className="action-row">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => {
                  setDestinations((ds) => {
                    const next = [...ds];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    return next;
                  });
                  touch();
                }}
              >
                Subir
              </button>
              <button
                type="button"
                disabled={i === destinations.length - 1}
                onClick={() => {
                  setDestinations((ds) => {
                    const next = [...ds];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    return next;
                  });
                  touch();
                }}
              >
                Descer
              </button>
              {destinations.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinations((ds) => {
                      const rest = ds.filter((_, n) => n !== i);
                      return rest.length === 1
                        ? [{ ...rest[0], startDate: "", endDate: "" }]
                        : rest;
                    });
                    touch();
                  }}
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setDestinations(addDestinationWithDates(destinations, start, end));
            touch();
          }}
        >
          + Adicionar destino
        </button>
        {scheduleError && (
          <p className="form-error" role="alert">
            {scheduleError}
          </p>
        )}
        <DatePicker label="Início" value={start} onChange={setStart} />
        <DatePicker label="Fim" value={end} min={start} onChange={setEnd} />
        <CurrencySelector value={currency} onChange={setCurrency} />
        <section aria-label="Viajantes da viagem">
          <h2>Viajantes</h2>
          {members.map((member, i) => (
            <div key={member.userId} className="destination-field">
              <label>
                Viajante {i + 1}
                <input
                  required
                  value={member.displayName}
                  onChange={(e) => {
                    setMembers((rows) =>
                      rows.map((row) =>
                        row.userId === member.userId
                          ? { ...row, displayName: e.target.value }
                          : row,
                      ),
                    );
                    touch();
                  }}
                />
              </label>
              <div className="action-row">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    setMembers((rows) => {
                      const next = [...rows];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      return next;
                    });
                    touch();
                  }}
                >
                  Subir
                </button>
                <button
                  type="button"
                  disabled={i === members.length - 1}
                  onClick={() => {
                    setMembers((rows) => {
                      const next = [...rows];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      return next;
                    });
                    touch();
                  }}
                >
                  Descer
                </button>
                <button
                  type="button"
                  disabled={member.userId === user.id}
                  onClick={() => {
                    setMembers((rows) =>
                      rows.filter((row) => row.userId !== member.userId),
                    );
                    touch();
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMembers([...members, newTraveler()]);
              touch();
            }}
          >
            + Adicionar viajante
          </button>
          <small>
            Viajantes com registros vinculados precisam permanecer na viagem.
          </small>
        </section>
        <label>
          Capa
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                void importPhoto(f, id, user.id, "cover")
                  .then((p) => {
                    setCover(`media:${p.id}`);
                    touch();
                  })
                  .catch((err) => setError(err.message));
            }}
          />
        </label>
        {cover && (
          <>
            <div className="cover-preview">
              <TripCover cover={cover} position={position} />
            </div>
            <label>
              Reposicionar capa
              <input
                type="range"
                min={0}
                max={100}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setCover("");
                touch();
              }}
            >
              Remover capa
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={!valid || busy}>
          Concluir
        </button>
      </form>
      {trip && (
        <>
          <button
            className="text-button danger"
            onClick={() => setDeleting(true)}
          >
            Excluir viagem
          </button>
          {deleting && (
            <section role="alert">
              <p>
                Excluir {trip.name}? Os dados serão arquivados neste
                dispositivo.
              </p>
              <button
                className="button secondary"
                onClick={() => setDeleting(false)}
              >
                Cancelar
              </button>
              <button
                className="button danger"
                onClick={() => {
                  try {
                    persistTrip({ ...trip, deleted: true });
                    void onSaved().then(onClose);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Confirmar exclusão
              </button>
            </section>
          )}
        </>
      )}
    </ConfirmDiscard>
  );
}
