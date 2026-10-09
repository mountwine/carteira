import { useState } from "react";
import { useTravel } from "../data/TravelContext";
import {
  change,
  type AnyEntity,
  type Entity,
  type Reservation,
  type DocumentData,
} from "../domain/entities";
import type { PlaceData } from "../domain/models";
import { activityPlaceId } from "../domain/planning";
import {
  AttachmentPicker,
  ConfirmDiscard,
  DatePicker,
  TimeWheelPicker,
  PlaceAutocomplete,
  CurrencySelector,
} from "./local";
import { uploadFile } from "../data/files";
import { reservationChanges } from "../domain/planning";
export const reservationTypes: [string, string][] = [
  ["flight", "Voos"],
  ["hotel", "Hospedagens"],
  ["restaurant", "Restaurantes"],
  ["ticket", "Ingressos/Atividades"],
  ["transport", "Transporte"],
  ["other", "Outros"],
];
export const documentTypes: [string, string][] = [
  ["passport", "Passaporte"],
  ["visa", "Visto"],
  ["identity", "Identidade"],
  ["license", "CNH"],
  ["insurance", "Seguro viagem"],
  ["ticket", "Passagem/Comprovante"],
  ["other", "Outros"],
];
export function reservationFilter(
  category: string,
  filter: string,
  custom = "",
) {
  return (
    filter === "all" ||
    category === filter ||
    (filter === "ticket" && category === "tour") ||
    (filter === "transport" && category === "car") ||
    filter === `custom:${custom}`
  );
}
export function documentFilter(category: string, filter: string, custom = "") {
  return (
    filter === "all" ||
    category === filter ||
    (filter === "ticket" && category === "confirmation") ||
    filter === `custom:${custom}`
  );
}
export function validDocument(input: {
  title: string;
  category: string;
  customType?: string;
  hasAttachment: boolean;
}) {
  return !!(
    input.title.trim() &&
    input.category &&
    (input.category !== "other" || input.customType?.trim()) &&
    input.hasAttachment
  );
}
export function validReservation(input: {
  title: string;
  category: string;
  customType?: string;
  date: string;
  endDate?: string;
  time: string;
  address: string;
}) {
  return !!(
    input.title.trim() &&
    input.category &&
    (input.category !== "other" || input.customType?.trim()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
    (!input.endDate || input.endDate >= input.date) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) &&
    input.address.trim()
  );
}
export function validActivity(
  input: { title: string; date: string; time: string; address: string },
  start: string,
  end: string,
) {
  return !!(
    input.title.trim() &&
    input.address.trim() &&
    input.date >= start &&
    input.date <= end &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)
  );
}
export function LocalActivityEditor({
  record,
  initial = {},
  onClose,
}: {
  record?: AnyEntity;
  initial?: Record<string, unknown>;
  onClose: () => void;
}) {
  const t = useTravel(),
    old = record?.kind === "activity" ? record : undefined;
  const [title, setTitle] = useState(old?.data.title ?? ""),
    [date, setDate] = useState(
      old?.data.date ??
        String(
          initial.date ??
            (t.date >= t.trip.startDate && t.date <= t.trip.endDate
              ? t.date
              : t.trip.startDate),
        ),
    ),
    [time, setTime] = useState(old?.data.time ?? "09:00"),
    [place, setPlace] = useState<PlaceData>(
      old?.data.location ?? {
        name: old?.data.address ?? "",
        address: old?.data.address,
      },
    ),
    [notes, setNotes] = useState(old?.data.notes ?? ""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const valid = validActivity(
    { title, date, time, address: place.name },
    t.trip.startDate,
    t.trip.endDate,
  );
  return (
    <ConfirmDiscard
      title={old ? "Editar atividade" : "Nova atividade"}
      dirty={dirty}
      onClose={onClose}
    >
      <form
        className="record-form"
        onChange={() => setDirty(true)}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setBusy(true);
          try {
            const data = {
              ...old?.data,
              title,
              date,
              time,
              period:
                Number(time.slice(0, 2)) < 12
                  ? ("morning" as const)
                  : Number(time.slice(0, 2)) < 18
                    ? ("afternoon" as const)
                    : ("evening" as const),
              duration: old?.data.duration ?? 60,
              fixed: old?.data.fixed ?? false,
              placeId: activityPlaceId(place, old?.data.placeId),
              location: place,
              address: place.address || place.name,
              lat: place.lat ?? null,
              lng: place.lng ?? null,
              participants: old?.data.participants ?? [t.user.id],
              notes,
              order: Number(time.replace(":", "")),
              status: old?.data.status ?? "planned",
              reservationId: old?.data.reservationId ?? "",
              needsTime: false,
            };
            await t.save(old ? { ...old, data } : t.make("activity", data));
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nome da atividade *
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <DatePicker
          value={date}
          min={t.trip.startDate}
          max={t.trip.endDate}
          onChange={setDate}
        />
        <TimeWheelPicker value={time} onChange={setTime} />
        <PlaceAutocomplete
          label="Local *"
          value={place}
          onChange={(p) => {
            setPlace(p);
            setDirty(true);
          }}
        />
        <label>
          Observações
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={!valid || busy}>
          Concluir
        </button>
      </form>
    </ConfirmDiscard>
  );
}
export function LocalReservationEditor({
  record,
  onClose,
}: {
  record?: AnyEntity;
  onClose: () => void;
}) {
  const t = useTravel(),
    old = record?.kind === "reservation" ? record : undefined;
  const [title, setTitle] = useState(old?.data.title ?? ""),
    [category, setCategory] = useState<Reservation["category"]>(
      old?.data.category === "car"
        ? "transport"
        : old?.data.category === "tour"
          ? "ticket"
          : (old?.data.category ?? "flight"),
    ),
    [custom, setCustom] = useState(old?.data.customType ?? ""),
    [date, setDate] = useState(old?.data.date ?? t.trip.startDate),
    [endDate, setEndDate] = useState(
      old?.data.endDate &&
        old.data.endDate >= (old?.data.date ?? t.trip.startDate)
        ? old.data.endDate
        : (old?.data.date ?? t.trip.startDate),
    ),
    [time, setTime] = useState(old?.data.time ?? "09:00"),
    [endTime, setEndTime] = useState(old?.data.endTime ?? ""),
    [place, setPlace] = useState<PlaceData>(
      old?.data.location ?? {
        name: old?.data.address ?? "",
        address: old?.data.address,
        city: old?.data.city,
      },
    ),
    [price, setPrice] = useState(String(old?.data.price ?? "")),
    [currency, setCurrency] = useState(old?.data.currency ?? t.trip.currency),
    [code, setCode] = useState(old?.data.code ?? ""),
    [status, setStatus] = useState<Reservation["status"]>(
      old?.data.status ?? "confirmed",
    ),
    [notes, setNotes] = useState(old?.data.notes ?? ""),
    [file, setFile] = useState<File | null>(null),
    [integrate, setIntegrate] = useState(old?.data.addToItinerary ?? true),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const valid =
    validReservation({
      title,
      category,
      customType: custom,
      date,
      endDate,
      time,
      address: place.name,
    }) &&
    (price === "" || Number(price) >= 0);
  return (
    <ConfirmDiscard
      title={old ? "Editar reserva" : "Nova reserva"}
      dirty={dirty}
      onClose={onClose}
    >
      <form
        className="record-form"
        onChange={() => setDirty(true)}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setBusy(true);
          try {
            let documentId = old?.data.documentId ?? "";
            const changes = [];
            if (file) {
              const meta = await uploadFile(file, t.trip, t.user);
              const doc = t.make("document", {
                title: file.name,
                category: "confirmation",
                expires: "",
                notes: "Anexo de reserva",
                ...meta,
                essential: true,
                fictitious: false,
              });
              documentId = doc.id;
              changes.push(change(doc));
            }
            const data: Reservation = {
              ...old?.data,
              title,
              category: category as Reservation["category"],
              customType: custom,
              date,
              endDate: endDate,
              time,
              endTime,
              address: place.address || place.name,
              location: place,
              city: place.city ?? "",
              code,
              price: Number(price) || 0,
              currency,
              notes,
              status,
              documentId,
              addToItinerary: integrate,
            };
            const r = old ? { ...old, data } : t.make("reservation", data);
            changes.push(
              change(r),
              ...reservationChanges(r, t.records, t.trip, t.user),
            );
            await t.commit(changes, "Reserva salva");
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nome *
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Tipo *
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as Reservation["category"])
            }
          >
            {reservationTypes.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {category === "other" && (
          <label>
            Qual tipo? *
            <input
              required
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </label>
        )}
        <DatePicker
          label="Data *"
          value={date}
          onChange={(next) => {
            setDate(next);
            if (endDate < next) setEndDate(next);
          }}
        />
        <DatePicker
          label="Data final"
          value={endDate}
          min={date}
          onChange={setEndDate}
        />
        <TimeWheelPicker value={time} onChange={setTime} />
        <label>
          Horário final
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>
        <PlaceAutocomplete
          label="Local *"
          value={place}
          onChange={(p) => {
            setPlace(p);
            setDirty(true);
          }}
        />
        <label>
          Valor
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <CurrencySelector value={currency} onChange={setCurrency} />
        <label>
          Código da reserva
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Reservation["status"])}
          >
            <option value="confirmed">Confirmada</option>
            <option value="pending">Pendente</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </label>
        <AttachmentPicker onChange={setFile} />
        {old?.data.documentId && (
          <small>Anexo atual preservado ao salvar sem um novo arquivo.</small>
        )}
        <label>
          Detalhes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={integrate}
            onChange={(e) => setIntegrate(e.target.checked)}
          />
          Adicionar ao roteiro
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={!valid || busy}>
          Concluir
        </button>
      </form>
    </ConfirmDiscard>
  );
}
export function LocalDocumentEditor({
  record,
  onClose,
  initial = {},
  onSaved,
}: {
  record?: AnyEntity;
  onClose: () => void;
  initial?: Record<string, unknown>;
  onSaved?: (record: AnyEntity) => void;
}) {
  const t = useTravel(),
    old = record?.kind === "document" ? record : undefined;
  const [title, setTitle] = useState(
      old?.data.title ?? String(initial.title ?? ""),
    ),
    [category, setCategory] = useState<DocumentData["category"]>(
      old?.data.category === "confirmation"
        ? "ticket"
        : (old?.data.category ?? "passport"),
    ),
    [custom, setCustom] = useState(old?.data.customType ?? ""),
    [number, setNumber] = useState(old?.data.number ?? ""),
    [country, setCountry] = useState(old?.data.issuingCountry ?? ""),
    [issued, setIssued] = useState(old?.data.issued ?? ""),
    [expires, setExpires] = useState(old?.data.expires ?? ""),
    [notes, setNotes] = useState(old?.data.notes ?? ""),
    [file, setFile] = useState<File | null>(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const valid = validDocument({
    title,
    category,
    customType: custom,
    hasAttachment: !!(file || old?.data.filePath),
  });
  return (
    <ConfirmDiscard
      title={old ? "Editar documento" : "Novo documento"}
      dirty={dirty}
      onClose={onClose}
    >
      <form
        className="record-form"
        onChange={() => setDirty(true)}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setBusy(true);
          try {
            const meta = file
              ? await uploadFile(file, t.trip, t.user)
              : {
                  filePath: old!.data.filePath,
                  fileName: old!.data.fileName,
                  mime: old!.data.mime,
                };
            const data: DocumentData = {
              ...old?.data,
              title,
              category: category as DocumentData["category"],
              customType: custom,
              number,
              issuingCountry: country,
              issued,
              expires,
              notes,
              ...meta,
              essential: true,
              fictitious: file ? false : (old?.data.fictitious ?? false),
            };
            const next = old
              ? { ...old, data }
              : t.make("document", data, "private");
            await t.save(next);
            onSaved?.(next);
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nome *
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Tipo *
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as DocumentData["category"])
            }
          >
            {documentTypes.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {category === "other" && (
          <label>
            Qual tipo? *
            <input
              required
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </label>
        )}
        <label>
          Número
          <input value={number} onChange={(e) => setNumber(e.target.value)} />
        </label>
        <label>
          País emissor
          <input value={country} onChange={(e) => setCountry(e.target.value)} />
        </label>
        <label>
          Data de emissão
          <input
            type="date"
            value={issued}
            onChange={(e) => setIssued(e.target.value)}
            onInput={(e) => setIssued(e.currentTarget.value)}
          />
        </label>
        <label>
          Data de validade
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            onInput={(e) => setExpires(e.currentTarget.value)}
          />
        </label>
        <AttachmentPicker label="Anexo *" onChange={setFile} />
        <small>
          {file?.name ||
            old?.data.fileName ||
            "Selecione uma foto ou documento."}
        </small>
        <label>
          Detalhes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={!valid || busy}>
          Concluir
        </button>
      </form>
    </ConfirmDiscard>
  );
}
