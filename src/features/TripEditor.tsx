import { useState } from "react";
import type { Trip, User, PlaceData } from "../domain/models";
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
import type { AnyEntity } from "../domain/entities";
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
    [destinations, setDestinations] = useState<PlaceData[]>(
      trip?.destinations.map(
        (d) => d.place ?? { name: d.city, country: d.country },
      ) ?? [{ name: "" }],
    ),
    [start, setStart] = useState(trip?.startDate ?? ""),
    [end, setEnd] = useState(trip?.endDate ?? ""),
    [cover, setCover] = useState(trip?.cover ?? ""),
    [position, setPosition] = useState(trip?.coverPosition ?? 50),
    [currency, setCurrency] = useState(trip?.currency ?? "USD"),
    [names, setNames] = useState(
      trip?.members.map((m) => m.displayName).join("\n") ?? user.name,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [deleting, setDeleting] = useState(false);
  const valid = !!(
    name.trim() &&
    origin.name.trim() &&
    start &&
    end &&
    end >= start &&
    destinations.length &&
    destinations.every((d) => d.name.trim())
  );
  function touch() {
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    try {
      if (!valid)
        throw new Error("Preencha os campos obrigatórios e revise as datas.");
      if (trip) {
        const activities = (await all<AnyEntity>("records")).filter(
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
      const next: Trip = {
        ...(trip ?? {}),
        id,
        name: name.trim(),
        origin,
        cover,
        coverPosition: position,
        startDate: start,
        endDate: end,
        currency,
        pace: trip?.pace ?? "balanced",
        isDemo: false,
        destinations: destinations.map((p, i) => ({
          ...trip?.destinations.find((d) => d.city === p.name),
          id:
            trip?.destinations.find((d) => d.city === p.name)?.id ??
            crypto.randomUUID(),
          city: p.name,
          country: p.country ?? "",
          place: p,
          startDate:
            trip?.destinations.find(
              (d) =>
                d.city === p.name && d.startDate >= start && d.startDate <= end,
            )?.startDate ?? start,
          endDate:
            trip?.destinations.find(
              (d) =>
                d.city === p.name && d.endDate <= end && d.endDate >= start,
            )?.endDate ?? end,
          timezone: trip?.destinations.find((d) => d.city === p.name)?.timezone,
          transport: [],
        })),
        members: names
          .split("\n")
          .map((n) => n.trim())
          .filter(Boolean)
          .map((displayName, i) => ({
            userId:
              trip?.members.find((m) => m.displayName === displayName)
                ?.userId ??
              (displayName === user.name || (!trip && i === 0)
                ? user.id
                : crypto.randomUUID()),
            displayName,
            invitationState: "accepted",
            preferences: {},
          })),
      };
      if (!next.members.some((m) => m.userId === user.id))
        next.members.unshift({
          userId: user.id,
          displayName: user.name,
          invitationState: "accepted",
          preferences: {},
        });
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
        className="record-form"
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
          <div key={i} className="destination-field">
            <PlaceAutocomplete
              label={`Destino ${i + 1}`}
              value={p}
              onChange={(place) => {
                setDestinations((ds) =>
                  ds.map((d, n) => (n === i ? place : d)),
                );
                touch();
              }}
            />
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
                    setDestinations((ds) => ds.filter((_, n) => n !== i));
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
            setDestinations([...destinations, { name: "" }]);
            touch();
          }}
        >
          + Adicionar destino
        </button>
        <DatePicker label="Início" value={start} onChange={setStart} />
        <DatePicker label="Fim" value={end} min={start} onChange={setEnd} />
        <CurrencySelector value={currency} onChange={setCurrency} />
        <label>
          Viajantes · um nome por linha
          <textarea value={names} onChange={(e) => setNames(e.target.value)} />
        </label>
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
