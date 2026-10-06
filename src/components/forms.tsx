import { currencies as currencyCodes } from "./local";
import { importPhoto } from "../data/media";
import { MediaImage } from "./MediaImage";
import {
  LocalActivityEditor,
  LocalReservationEditor,
  LocalDocumentEditor,
} from "./LocalEditors";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  X,
  Plus,
  Trash2,
  Pencil,
  Lock,
  Users,
  ChevronLeft,
} from "lucide-react";
import { Button, Card } from "./ui";
import { useTravel, type Screen } from "../data/TravelContext";
import {
  type Kind,
  type AnyEntity,
  type EntityMap,
  ofKind,
  expenseCategories,
} from "../domain/entities";
import { message } from "../data/engine";
import { uploadFile } from "../data/files";
import { places, providers } from "../adapters/providers";
export function Modal({
  title,
  onClose,
  children,
  placement = "center",
}: {
  placement?: "center" | "bottom";
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet ${placement === "bottom" ? "sheet-bottom" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-inner">
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Page({
  title,
  subtitle,
  children,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  back?: Screen;
}) {
  const t = useTravel();
  return (
    <main className="module-page">
      {t.backLabel && (
        <button className="text-button" onClick={t.back}>
          <ChevronLeft size={18} />
          {t.backLabel}
        </button>
      )}
      <div className="module-heading">
        <div>
          <span className="eyebrow">{t.trip.name}</span>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}
export function Empty({
  title = "Ainda não há itens",
  text = "Adicione o primeiro item para começar.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </Card>
  );
}
export function Segments<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segments" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function AddButton({
  onClick,
  label = "Adicionar",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button className="add-button" aria-label={label} onClick={onClick}>
      <Plus size={23} />
    </button>
  );
}
export function RecordActions({
  record,
  onEdit,
  extra,
}: {
  record: AnyEntity;
  onEdit: () => void;
  extra?: ReactNode;
}) {
  const t = useTravel(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="record-actions">
        {extra}
        <button
          className="icon-button"
          aria-label={`Editar ${record.data.title}`}
          onClick={onEdit}
        >
          <Pencil size={17} />
        </button>
        <button
          className="icon-button"
          aria-label={`Excluir ${record.data.title}`}
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={17} />
        </button>
        {record.visibility === "private" && (
          <span title="Só eu" className="privacy-label">
            <Lock size={14} />
            Só eu
          </span>
        )}
      </div>
      {confirm && (
        <Modal title="Excluir este item?" onClose={() => setConfirm(false)}>
          <p>
            “{record.data.title}” será removido
            {record.visibility === "trip" ? " para todos os participantes" : ""}
            . Você poderá desfazer esta ação.
          </p>
          <div className="action-row">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void t
                  .drop(record)
                  .then(() => setConfirm(false))
                  .catch((e) => {
                    t.notify(message(e));
                    setBusy(false);
                  });
              }}
            >
              Excluir
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
interface Field {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "time"
    | "select"
    | "check"
    | "multi"
    | "tags"
    | "url";
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  hint?: string;
}
const options = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
const labeled = (obj: Record<string, string>) =>
  Object.entries(obj).map(([value, label]) => ({ value, label }));
function GenericRecordEditor({
  kind,
  record,
  onClose,
  initial = {},
  onSaved,
}: {
  kind: Kind;
  record?: AnyEntity;
  onClose: () => void;
  initial?: Record<string, unknown>;
  onSaved?: (r: AnyEntity) => void;
}) {
  const t = useTravel();
  const [data, setData] = useState<Record<string, unknown>>(() => ({
    ...defaults(kind, t),
    ...(kind === "expense"
      ? { currency: t.trip.currency, rate: t.trip.currency === "USD" ? 1 : 0 }
      : {}),
    ...(record?.data ?? {}),
    ...initial,
  }));
  const [visibility, setVisibility] = useState(
    record?.visibility ??
      ([
        "profile",
        "emergency",
        "message",
        "proposal",
        "document",
        "note",
      ].includes(kind)
        ? "private"
        : "trip"),
  );
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const members = t.trip.members
    .filter((m) => m.invitationState === "accepted")
    .map((m) => ({ value: m.userId, label: m.displayName }));
  const currencies = options(currencyCodes);
  const docs = ofKind(t.records, "document").map((d) => ({
    value: d.id,
    label: d.data.title,
  }));
  const bags = ofKind(t.records, "bag").map((d) => ({
    value: d.id,
    label: d.data.title,
  }));
  const fields: Record<Kind, Field[]> = {
    activity: [
      { key: "date", label: "Dia", type: "date", required: true },
      { key: "time", label: "Horário exato (opcional)", type: "time" },
      {
        key: "period",
        label: "Período",
        type: "select",
        options: labeled({
          morning: "Manhã",
          afternoon: "Tarde",
          evening: "Noite",
        }),
      },
      {
        key: "duration",
        label: "Duração em minutos",
        type: "number",
        min: 5,
        max: 1440,
        step: "5",
      },
      { key: "fixed", label: "Horário fixo", type: "check" },
      {
        key: "placeId",
        label: "Lugar",
        type: "select",
        options: [
          { value: "", label: "Sem lugar vinculado" },
          ...places.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.city}`,
          })),
        ],
      },
      { key: "address", label: "Endereço" },
      {
        key: "participants",
        label: "Participantes",
        type: "multi",
        options: members,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: labeled({
          planned: "Planejada",
          done: "Visitada / concluída",
        }),
      },
      { key: "notes", label: "Observações", type: "textarea" },
    ],
    reservation: [
      {
        key: "category",
        label: "Tipo",
        type: "select",
        options: labeled({
          flight: "Voo",
          hotel: "Hotel",
          car: "Carro",
          restaurant: "Restaurante",
          ticket: "Ingresso",
          tour: "Tour",
          transport: "Outro transporte",
        }),
      },
      { key: "date", label: "Data inicial", type: "date", required: true },
      { key: "time", label: "Horário local", type: "time" },
      { key: "endDate", label: "Data final", type: "date" },
      { key: "endTime", label: "Horário final local", type: "time" },
      { key: "city", label: "Cidade" },
      { key: "address", label: "Endereço" },
      { key: "code", label: "Código de confirmação" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: labeled({
          confirmed: "Confirmada",
          pending: "Pendente",
          cancelled: "Cancelada",
        }),
      },
      { key: "price", label: "Valor", type: "number" },
      { key: "currency", label: "Moeda", type: "select", options: currencies },
      {
        key: "documentId",
        label: "Documento anexado",
        type: "select",
        options: [{ value: "", label: "Nenhum" }, ...docs],
      },
      {
        key: "addToItinerary",
        label: "Adicionar / atualizar automaticamente no roteiro",
        type: "check",
      },
      { key: "notes", label: "Detalhes importantes", type: "textarea" },
    ],
    expense: [
      { key: "date", label: "Data", type: "date", required: true },
      { key: "amount", label: "Valor pago", type: "number", required: true },
      {
        key: "currency",
        label: "Moeda original",
        type: "select",
        options: currencies,
      },
      {
        key: "rate",
        label: "Taxa para USD",
        type: "number",
        min: 0.000001,
        step: "any",
        hint: "Taxa para USD. Informe a taxa efetivamente paga; o câmbio online é uma referência de mercado.",
      },
      {
        key: "category",
        label: "Categoria",
        type: "select",
        options: options(expenseCategories),
      },
      { key: "payer", label: "Quem pagou", type: "select", options: members },
      {
        key: "split",
        label: "Dividir entre (opcional)",
        type: "multi",
        options: members,
      },
      { key: "notes", label: "Observações", type: "textarea" },
    ],
    shopping: [
      { key: "actualPrice", label: "Preço efetivamente pago", type: "number" },
      {
        key: "quantity",
        label: "Quantidade",
        type: "number",
        min: 1,
        step: "1",
      },
      { key: "physical", label: "Produto físico", type: "check" },
      {
        key: "returnOptOut",
        label: "Não incluir na bagagem de retorno",
        type: "check",
      },
      { key: "brand", label: "Marca" },
      { key: "image", label: "URL da foto", type: "url" },
      { key: "store", label: "Loja" },
      { key: "url", label: "Link do produto", type: "url" },
      { key: "price", label: "Preço estimado", type: "number" },
      { key: "targetPrice", label: "Preço-alvo", type: "number" },
      { key: "currency", label: "Moeda", type: "select", options: currencies },
      {
        key: "priority",
        label: "Prioridade",
        type: "select",
        options: labeled({ low: "Baixa", medium: "Média", high: "Alta" }),
      },
      { key: "size", label: "Tamanho" },
      { key: "weight", label: "Peso estimado (kg)", type: "number" },
      {
        key: "bagId",
        label: "Mala para a volta",
        type: "select",
        options: [{ value: "", label: "Ainda sem mala" }, ...bags],
      },
      { key: "notes", label: "Observações", type: "textarea" },
    ],
    bag: [
      { key: "traveler", label: "Viajante", type: "select", options: members },
      {
        key: "type",
        label: "Tipo",
        type: "select",
        options: labeled({
          backpack: "Mochila",
          cabin: "Mala de mão",
          checked: "Mala despachada",
        }),
      },
      { key: "limit", label: "Limite (kg)", type: "number" },
      { key: "actualWeight", label: "Peso atual medido (kg)", type: "number" },
    ],
    packing: [
      { key: "traveler", label: "Viajante", type: "select", options: members },
      {
        key: "bagId",
        label: "Mala",
        type: "select",
        options: [{ value: "", label: "Sem mala" }, ...bags],
      },
      {
        key: "category",
        label: "Categoria",
        type: "select",
        options: options([
          "Roupas",
          "Calçados",
          "Higiene",
          "Eletrônicos",
          "Outros",
        ]),
      },
      { key: "weight", label: "Peso por unidade (kg)", type: "number" },
      {
        key: "quantity",
        label: "Quantidade",
        type: "number",
        min: 1,
        step: "1",
      },
      { key: "packed", label: "Arrumado para ir", type: "check" },
      { key: "returnPacked", label: "Arrumado para voltar", type: "check" },
    ],
    checklist: [
      {
        key: "phase",
        label: "Fase",
        type: "select",
        options: labeled({
          before: "Antes da viagem",
          during: "Durante",
          return: "Retorno",
        }),
      },
      { key: "due", label: "Prazo", type: "date" },
      {
        key: "assignee",
        label: "Responsável",
        type: "select",
        options: members,
      },
      { key: "done", label: "Concluído", type: "check" },
    ],
    document: [
      {
        key: "category",
        label: "Tipo",
        type: "select",
        options: labeled({
          passport: "Passaporte",
          visa: "Visto",
          insurance: "Seguro",
          ticket: "Ticket",
          confirmation: "Confirmação",
          other: "Outro",
        }),
      },
      { key: "expires", label: "Validade", type: "date" },
      {
        key: "essential",
        label: "Essencial · preparar para acesso offline",
        type: "check",
      },
      { key: "notes", label: "Observações", type: "textarea" },
    ],
    memory: [
      { key: "date", label: "Dia", type: "date", required: true },
      { key: "notes", label: "Seu diário", type: "textarea" },
      {
        key: "rating",
        label: "Avaliação do dia (1–5)",
        type: "number",
        min: 1,
        max: 5,
        step: "1",
      },
      {
        key: "placeId",
        label: "Lugar",
        type: "select",
        options: [
          { value: "", label: "Sem lugar" },
          ...places.map((p) => ({ value: p.id, label: p.name })),
        ],
      },
      { key: "favorite", label: "Momento favorito", type: "check" },
    ],
    saved: [
      { key: "notes", label: "Suas anotações", type: "textarea" },
      { key: "tags", label: "Tags (separadas por vírgula)", type: "tags" },
      {
        key: "priority",
        label: "Prioridade",
        type: "select",
        options: labeled({ low: "Baixa", medium: "Média", high: "Alta" }),
      },
    ],
    budget: [
      { key: "total", label: "Orçamento total", type: "number" },
      {
        key: "currency",
        label: "Moeda principal de exibição",
        type: "select",
        options: currencies,
      },
      ...expenseCategories.map((c) => ({
        key: `category:${c}`,
        label: `Limite · ${c}`,
        type: "number" as const,
      })),
    ],
    profile: [
      {
        key: "language",
        label: "Idioma preferido",
        type: "select",
        options: labeled({
          "pt-BR": "Português (Brasil)",
          en: "English",
          es: "Español",
        }),
      },
      {
        key: "currency",
        label: "Moeda preferida",
        type: "select",
        options: currencies,
      },
      {
        key: "interests",
        label: "Interesses (separados por vírgula)",
        type: "tags",
      },
      { key: "priorities", label: "Prioridades" },
      { key: "shoeSize", label: "Calçado (opcional)" },
      { key: "clothesSize", label: "Roupa (opcional)" },
      { key: "height", label: "Altura em cm (opcional)", type: "number" },
      {
        key: "preferences",
        label: "Preferências permanentes",
        type: "textarea",
      },
      {
        key: "tripPreferences",
        label: "Preferências para esta viagem",
        type: "textarea",
      },
      {
        key: "theme",
        label: "Tema",
        type: "select",
        options: labeled({
          dark: "Escuro",
          light: "Claro",
          auto: "Automático",
        }),
      },
    ],
    emergency: [
      {
        key: "localNumber",
        label: "Número de emergência local (confirme em fonte oficial)",
      },
      { key: "consulateName", label: "Consulado / embaixada" },
      { key: "consulatePhone", label: "Telefone consular" },
      { key: "consulateAddress", label: "Endereço consular" },
      { key: "contactName", label: "Contato de emergência" },
      { key: "contactPhone", label: "Telefone com código do país" },
      { key: "insurance", label: "Seguradora" },
      { key: "policy", label: "Apólice" },
      { key: "insurancePhone", label: "Telefone da seguradora" },
      {
        key: "medicalNotes",
        label: "Informações médicas que deseja carregar (opcional)",
        type: "textarea",
      },
      {
        key: "cardEnglish",
        label: "Cartão em inglês (texto revisado por você)",
        type: "textarea",
      },
    ],
    day: [
      { key: "date", label: "Dia", type: "date" },
      {
        key: "intensity",
        label: "Ritmo do dia",
        type: "select",
        options: labeled({
          light: "Leve",
          balanced: "Equilibrado",
          intense: "Intenso",
        }),
      },
      { key: "notes", label: "Notas do dia", type: "textarea" },
    ],
    note: [
      { key: "date", label: "Dia", type: "date" },
      { key: "notes", label: "Nota", type: "textarea" },
    ],
    proposal: [],
    message: [],
  };
  const personal = ["shopping", "document", "memory", "saved", "note"].includes(
    kind,
  );
  const value = (f: Field) =>
    f.key.startsWith("category:")
      ? ((data.categories as Record<string, number>)?.[f.key.slice(9)] ?? 0)
      : data[f.key];
  async function update(f: Field, v: unknown) {
    setData((prev) =>
      f.key.startsWith("category:")
        ? {
            ...prev,
            categories: { ...(prev.categories as object), [f.key.slice(9)]: v },
          }
        : {
            ...prev,
            [f.key]: v,
            ...(f.key === "currency" && kind === "expense"
              ? { rate: String(v) === "USD" ? 1 : 0 }
              : {}),
          },
    );
    if (f.key === "placeId" && kind === "activity") {
      const p = places.find((p) => p.id === v);
      if (p)
        setData((prev) => ({
          ...prev,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          title: prev.title || p.name,
        }));
    }
    if (f.key === "currency" && kind === "expense") {
      try {
        const quote = await providers.fx.rate(String(v), "USD");
        setData((prev) =>
          prev.currency === String(v) && Number(prev.rate) <= 0
            ? { ...prev, rate: quote.rate }
            : prev,
        );
      } catch (e) {
        setError(message(e) + " Informe a taxa manualmente.");
        setData((prev) =>
          prev.currency === String(v) ? { ...prev, rate: 0 } : prev,
        );
      }
    }
  }
  useEffect(() => {
    if (kind !== "expense" || record || data.currency === "USD") return;
    let alive = true;
    const requested = String(data.currency);
    void providers.fx
      .rate(requested, "USD")
      .then((q) => {
        if (alive)
          setData((prev) =>
            prev.currency === requested && Number(prev.rate) <= 0
              ? { ...prev, rate: q.rate }
              : prev,
          );
      })
      .catch((e) => {
        if (alive) setError(message(e) + " Informe a taxa manualmente.");
      });
    return () => {
      alive = false;
    };
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...data };
      if (kind === "shopping" && !payload.quantity) payload.quantity = 1;
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      for (const f of fields[kind])
        if (f.type === "date" || f.type === "time")
          payload[f.key] = String(formData.get(f.key) ?? data[f.key] ?? "");
      if (file && kind === "document")
        Object.assign(payload, await uploadFile(file, t.trip, t.user), {
          fictitious: false,
        });
      if (kind === "activity" && !record) {
        const acts = ofKind(t.records, "activity").filter(
          (a) => a.data.date === payload.date,
        );
        payload.order = payload.time
          ? Number(String(payload.time).slice(0, 2)) * 60 +
            Number(String(payload.time).slice(3))
          : Math.max(0, ...acts.map((a) => a.data.order)) + 60;
      }
      const r = (
        record
          ? { ...record, data: payload, visibility }
          : t.make(
              kind,
              payload as unknown as EntityMap[typeof kind],
              visibility,
            )
      ) as AnyEntity;
      await t.save(r);
      onSaved?.(r);
      onClose();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={record ? "Editar item" : "Novo item"} onClose={onClose}>
      <form className="editor-form" onSubmit={submit}>
        <label>
          Nome / título
          <input
            autoFocus
            required
            maxLength={160}
            value={String(data.title ?? "")}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </label>
        {false && personal && (!record || record?.ownerId === t.user.id) && (
          <label>
            Visibilidade
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "private" | "trip")
              }
            >
              <option value="private">🔒 Só eu</option>
              <option value="trip">👥 Viagem</option>
            </select>
          </label>
        )}
        {fields[kind].map((f) => (
          <label
            key={f.key}
            className={f.type === "check" ? "check-label" : ""}
          >
            {f.type === "check" ? (
              <>
                <input
                  type="checkbox"
                  checked={!!value(f)}
                  onChange={(e) => {
                    void update(f, e.target.checked);
                  }}
                />
                {f.label}
              </>
            ) : (
              <>
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={String(value(f) ?? "")}
                    onChange={(e) => {
                      void update(f, e.target.value);
                    }}
                  />
                ) : f.type === "select" ? (
                  <select
                    value={String(value(f) ?? "")}
                    onChange={(e) => {
                      void update(f, e.target.value);
                    }}
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "multi" ? (
                  <div className="multi-options">
                    {f.options?.map((o) => (
                      <span key={o.value}>
                        <input
                          aria-label={o.label}
                          type="checkbox"
                          checked={((value(f) as string[]) ?? []).includes(
                            o.value,
                          )}
                          onChange={(e) => {
                            const arr = (value(f) as string[]) ?? [];
                            void update(
                              f,
                              e.target.checked
                                ? [...arr, o.value]
                                : arr.filter((v) => v !== o.value),
                            );
                          }}
                        />
                        {o.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <input
                    name={f.key}
                    type={
                      f.type === "tags" || f.type === "time"
                        ? "text"
                        : (f.type ?? "text")
                    }
                    placeholder={f.type === "time" ? "HH:mm" : undefined}
                    pattern={
                      f.type === "time"
                        ? "([01][0-9]|2[0-3]):[0-5][0-9]"
                        : undefined
                    }
                    required={f.required}
                    min={f.min ?? (f.type === "number" ? 0 : undefined)}
                    max={f.max}
                    step={f.step ?? (f.type === "number" ? "0.01" : undefined)}
                    value={
                      f.type === "tags"
                        ? ((value(f) as string[]) ?? []).join(", ")
                        : String(value(f) ?? "")
                    }
                    onChange={(e) => {
                      void update(
                        f,
                        f.type === "number"
                          ? Number(e.target.value)
                          : f.type === "tags"
                            ? e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                            : e.target.value,
                      );
                    }}
                  />
                )}
                {f.hint && <small>{f.hint}</small>}
              </>
            )}
          </label>
        ))}
        {kind === "shopping" && (
          <section>
            <label>
              Fotos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  setBusy(true);
                  try {
                    const ids: string[] = [];
                    for (const file of files) {
                      const photo = await importPhoto(
                        file,
                        t.trip.id,
                        t.user.id,
                        "shopping",
                      );
                      ids.push(photo.id);
                    }
                    setData((prev) => ({
                      ...prev,
                      photoIds: [
                        ...((prev.photoIds as string[]) ?? []),
                        ...ids,
                      ],
                    }));
                  } catch (err) {
                    setError(message(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            <div className="shopping-photos">
              {((data.photoIds as string[]) ?? []).map((id) => (
                <div key={id}>
                  <MediaImage id={id} thumb />
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setData({
                        ...data,
                        photoIds: ((data.photoIds as string[]) ?? []).filter(
                          (x) => x !== id,
                        ),
                      })
                    }
                  >
                    Remover foto
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        {kind === "document" && (
          <label>
            Arquivo (PDF, imagem ou TXT · até 10 MB)
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {record?.kind === "document" && record.data.fileName && (
              <small>Atual: {record.data.fileName}</small>
            )}
          </label>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="action-row">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function defaults(
  kind: Kind,
  t: ReturnType<typeof useTravel>,
): Record<string, unknown> {
  const date =
    t.date >= t.trip.startDate && t.date <= t.trip.endDate
      ? t.date
      : t.trip.startDate;
  const base = { title: "" };
  const data: Record<Kind, object> = {
    activity: {
      date,
      time: "",
      period: "morning",
      duration: 60,
      fixed: false,
      placeId: "",
      address: "",
      lat: null,
      lng: null,
      participants: t.trip.members
        .filter((m) => m.invitationState === "accepted")
        .map((m) => m.userId),
      notes: "",
      order: 0,
      status: "planned",
      reservationId: "",
    },
    reservation: {
      category: "hotel",
      date,
      endDate: date,
      time: "",
      endTime: "",
      city: t.trip.destinations[0]?.city ?? "",
      address: "",
      code: "",
      price: 0,
      currency: "USD",
      status: "pending",
      notes: "",
      documentId: "",
      addToItinerary: true,
    },
    expense: {
      date,
      amount: 0,
      currency: "USD",
      rate: 1,
      category: "Alimentação",
      payer: t.user.id,
      split: [],
      shoppingId: "",
      notes: "",
    },
    shopping: {
      photoIds: [],
      physical: true,
      returnOptOut: false,
      quantity: 1,
      brand: "",
      image: "",
      price: 0,
      targetPrice: 0,
      currency: "USD",
      store: "",
      url: "",
      priority: "medium",
      size: "",
      notes: "",
      bought: false,
      actualPrice: 0,
      bagId: "",
      weight: 0,
    },
    bag: { traveler: t.user.id, type: "checked", limit: 23, actualWeight: 0 },
    packing: {
      bagId: "",
      traveler: t.user.id,
      category: "Roupas",
      weight: 0,
      quantity: 1,
      packed: false,
      returnPacked: false,
      shoppingId: "",
    },
    checklist: {
      phase: "before",
      due: date,
      assignee: t.user.id,
      done: false,
      suggested: false,
    },
    document: {
      category: "other",
      expires: "",
      notes: "",
      filePath: "",
      fileName: "",
      mime: "",
      essential: false,
      fictitious: false,
    },
    memory: {
      date,
      notes: "",
      rating: 5,
      placeId: "",
      favorite: false,
      photoIds: [],
    },
    saved: { placeId: "", notes: "", tags: [], priority: "medium" },
    budget: { total: 0, currency: "USD", categories: {} },
    profile: {
      title: t.user.name,
      language: "pt-BR",
      currency: "BRL",
      interests: ["Fotografia", "Gastronomia"],
      priorities: "",
      shoeSize: "",
      clothesSize: "",
      height: 0,
      preferences: "",
      tripPreferences: "",
      theme: "dark",
      notifications: { critical: true, useful: true, opportunities: false },
    },
    emergency: {
      title: "Meu cartão de emergência",
      contactName: "",
      contactPhone: "",
      insurance: "",
      policy: "",
      insurancePhone: "",
      medicalNotes: "",
      cardEnglish: "",
    },
    day: { date, intensity: "balanced", notes: "" },
    note: { date, notes: "" },
    proposal: {},
    message: {},
  };
  return { ...base, ...data[kind] };
}

export function RecordEditor(props: Parameters<typeof GenericRecordEditor>[0]) {
  if (props.kind === "activity") return <LocalActivityEditor {...props} />;
  if (props.kind === "reservation")
    return <LocalReservationEditor {...props} />;
  if (props.kind === "document") return <LocalDocumentEditor {...props} />;
  return <GenericRecordEditor {...props} />;
}
