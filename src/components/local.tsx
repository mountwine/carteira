import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PlaceData } from "../domain/models";
import { searchPlaces, placeDetails } from "../adapters/external";
import { Modal } from "./forms";
export const currencies = [
  "BRL",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "MXN",
];
export function CurrencySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label>
      Moeda
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {currencies.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
export function DatePicker({
  value,
  onChange,
  min,
  max,
  label = "Dia",
}: {
  value: string;
  onChange: (s: string) => void;
  min?: string;
  max?: string;
  label?: string;
}) {
  return (
    <label>
      {label}
      <input
        type="date"
        required
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => onChange(e.currentTarget.value)}
      />
    </label>
  );
}
export function TimeWheelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  const [h, m] = (value || "09:00").split(":");
  return (
    <fieldset className="time-picker">
      <legend>Horário</legend>
      <div>
        <label>
          Hora
          <select
            size={3}
            value={h}
            onChange={(e) => onChange(`${e.target.value}:${m}`)}
          >
            {Array.from({ length: 24 }, (_, i) =>
              String(i).padStart(2, "0"),
            ).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <span>:</span>
        <label>
          Minuto
          <select
            size={3}
            value={m}
            onChange={(e) => onChange(`${h}:${e.target.value}`)}
          >
            {Array.from({ length: 60 }, (_, i) =>
              String(i).padStart(2, "0"),
            ).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
}
export function PlaceAutocomplete({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PlaceData;
  onChange: (p: PlaceData) => void;
}) {
  const [options, setOptions] = useState<PlaceData[]>([]),
    [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [index, setIndex] = useState(0);
  const session = useRef(crypto.randomUUID());
  useEffect(() => {
    if (query.trim().length < 3) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus("Buscando lugares…");
      void searchPlaces(query, controller.signal, session.current)
        .then((data) => {
          setOptions(data);
          setIndex(0);
          setStatus(
            data.length ? "" : "Nenhum resultado. Use o texto informado.",
          );
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setOptions([]);
            setStatus(e.message);
          }
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  async function choose(p: PlaceData) {
    setStatus("Carregando local…");
    try {
      const full = await placeDetails(p, session.current);
      onChange(full);
      setQuery("");
      setOptions([]);
      setStatus("");
      session.current = crypto.randomUUID();
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  return (
    <div className="place-autocomplete">
      <label>
        {label}
        <input
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={!!options.length}
          value={value.name}
          onChange={(e) => {
            onChange({ name: e.target.value, provider: "manual" });
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOptions([]);
              e.stopPropagation();
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((n) => Math.min(n + 1, options.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((n) => Math.max(0, n - 1));
            }
            if (e.key === "Enter" && options[index]) {
              e.preventDefault();
              void choose(options[index]);
            }
          }}
          required
          autoComplete="off"
        />
      </label>
      {status && <small role="status">{status}</small>}
      {!!options.length && (
        <>
          <div role="listbox" aria-label={`Sugestões de ${label}`}>
            {options.map((p, i) => (
              <button
                type="button"
                role="option"
                aria-selected={i === index}
                key={p.providerId ?? p.name}
                onClick={() => void choose(p)}
              >
                <strong>{p.name}</strong>
                <small>{p.address}</small>
              </button>
            ))}
          </div>
          {options.some((p) => p.provider === "google") && (
            <small className="GMP-attribution" translate="no">
              Google Maps
            </small>
          )}
        </>
      )}
    </div>
  );
}
export function ProgressBar({ value }: { value: number }) {
  return (
    <progress
      max={100}
      value={value}
      aria-label={`${Math.round(value)}% concluído`}
    />
  );
}
export function DropdownFilter({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (s: string) => void;
  label: string;
  options: [string, string][];
}) {
  return (
    <label className="dropdown-filter">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ExpandableCard({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <h2>{title}</h2>
      {summary}
      <button
        className="text-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "Menos detalhes ↑" : "Mais detalhes ↓"}
      </button>
      {open && children}
    </section>
  );
}
export function ConfirmDiscard({
  dirty,
  onClose,
  children,
  title,
}: {
  dirty: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Modal
        title={title}
        onClose={() => (dirty ? setConfirm(true) : onClose())}
      >
        {children}
        <button
          type="button"
          className="text-button"
          onClick={() => (dirty ? setConfirm(true) : onClose())}
        >
          Cancelar
        </button>
      </Modal>
      {confirm && (
        <Modal title="Descartar alterações?" onClose={() => setConfirm(false)}>
          <p>As alterações deste formulário ainda não foram salvas.</p>
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            Continuar editando
          </button>
          <button className="button primary" onClick={onClose}>
            Descartar
          </button>
        </Modal>
      )}
    </>
  );
}

export function AttachmentPicker({
  label = "Anexo",
  onChange,
  required = false,
}: {
  label?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type="file"
        required={required}
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
export function PhotoPicker({
  label = "Fotos",
  onChange,
  multiple = true,
}: {
  label?: string;
  onChange: (files: File[]) => void;
  multiple?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          onChange(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </label>
  );
}
