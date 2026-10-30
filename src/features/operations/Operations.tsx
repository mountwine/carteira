import { DropdownFilter } from "../../components/local";
import {
  reservationTypes,
  documentTypes,
  reservationFilter,
  documentFilter,
} from "../../components/LocalEditors";
import { NavigateButton } from "../LocalSettings";
import { MediaImage } from "../../components/MediaImage";
import { useEffect, useRef, useState } from "react";
import {
  Plane,
  Hotel,
  Car,
  Utensils,
  Ticket,
  Wallet,
  ShoppingBag,
  Check,
  CheckCircle2,
  Briefcase,
  FileText,
  Download,
  Lock,
  Users,
  Image,
  Camera,
  Heart,
  Plus,
  ExternalLink,
} from "lucide-react";
import { useTravel } from "../../data/TravelContext";
import {
  ofKind,
  change,
  money,
  expenseCategories,
  type Entity,
  type AnyEntity,
} from "../../domain/entities";
import { totals, balances, purchaseChanges } from "../../domain/planning";
import { providers, places } from "../../adapters/providers";
import {
  Page,
  Segments,
  RecordEditor,
  RecordActions,
  AddButton,
  Empty,
  Modal,
} from "../../components/forms";
import { Card, Button } from "../../components/ui";
import { message } from "../../data/engine";
import { cacheDocument, documentBlob, uploadFile } from "../../data/files";
export function Reservations() {
  const t = useTravel();
  const [filter, setFilter] = useState("all"),
    [editing, setEditing] = useState<
      Entity<"reservation"> | null | undefined
    >(),
    [attachment, setAttachment] = useState<Entity<"reservation"> | null>(null);
  const list = ofKind(t.records, "reservation")
    .filter((r) =>
      reservationFilter(r.data.category, filter, r.data.customType),
    )
    .sort(
      (a, b) =>
        a.data.date.localeCompare(b.data.date) ||
        a.data.time.localeCompare(b.data.time),
    );
  return (
    <Page
      title="Reservas"
      subtitle="Voos, estadias e experiências, conectados ao roteiro."
      back="Mais"
      action={
        <AddButton label="Criar reserva" onClick={() => setEditing(null)} />
      }
    >
      <DropdownFilter
        label="Todas as reservas"
        value={filter}
        onChange={setFilter}
        options={[
          ["all", "Todas"],
          ...reservationTypes,
          ...Array.from(
            new Set(
              ofKind(t.records, "reservation")
                .map((r) => r.data.customType)
                .filter(Boolean),
            ),
          ).map((v) => [`custom:${v}`, v!] as [string, string]),
        ]}
      />
      {!list.length && <Empty />}
      {list.map((r) => {
        const Icon =
          r.data.category === "flight"
            ? Plane
            : r.data.category === "hotel"
              ? Hotel
              : r.data.category === "car"
                ? Car
                : r.data.category === "restaurant"
                  ? Utensils
                  : Ticket;
        return (
          <Card
            key={r.id}
            className={`reservation-card ${t.focus === r.id ? "focused-record" : ""}`}
          >
            <div className="section-heading">
              <Icon className="blue" />
              <span className={`status-chip ${r.data.status}`}>
                {r.data.status === "confirmed"
                  ? "Confirmada"
                  : r.data.status === "pending"
                    ? "Pendente"
                    : "Cancelada"}
              </span>
            </div>
            <h2>{r.data.title}</h2>
            <p>
              {r.data.date} {r.data.time} → {r.data.endDate} {r.data.endTime}
            </p>
            <p>
              {r.data.city} · {r.data.address}
            </p>
            <div className="detail-row">
              <span>
                Código <strong>{r.data.code || "Não informado"}</strong>
              </span>
              <span>
                Valor <strong>{money(r.data.price, r.data.currency)}</strong>
              </span>
            </div>
            {r.data.notes && <p>{r.data.notes}</p>}
            <div className="action-row">
              {r.data.address && (
                <NavigateButton
                  address={r.data.address}
                  lat={r.data.location?.lat}
                  lng={r.data.location?.lng}
                />
              )}
              {r.data.documentId && (
                <Button
                  variant="secondary"
                  onClick={() => t.navigate("Documentos", r.data.documentId)}
                >
                  Ver documento
                </Button>
              )}
              <Button variant="ghost" onClick={() => setAttachment(r)}>
                Anexar documento
              </Button>
            </div>
            {r.data.addToItinerary && (
              <button
                className="text-button"
                onClick={() => t.navigate("Roteiro")}
              >
                Vinculada ao roteiro →
              </button>
            )}
            <RecordActions record={r} onEdit={() => setEditing(r)} />
          </Card>
        );
      })}
      {editing !== undefined && (
        <RecordEditor
          kind="reservation"
          record={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}{" "}
      {attachment && (
        <RecordEditor
          kind="document"
          initial={{
            title: `Confirmação · ${attachment.data.title}`,
            category: "confirmation",
          }}
          onClose={() => setAttachment(null)}
          onSaved={(doc) => {
            void t
              .save({
                ...attachment,
                data: { ...attachment.data, documentId: doc.id },
              })
              .catch((e) => t.notify(message(e)));
          }}
        />
      )}
    </Page>
  );
}
export function Expenses() {
  const consumed = useRef(new Set<string>());
  const t = useTravel();
  const [editing, setEditing] = useState<
      Entity<"expense"> | null | undefined
    >(),
    [budgetOpen, setBudgetOpen] = useState(false),
    [filter, setFilter] = useState("Todas"),
    [factor, setFactor] = useState<number | null>(null),
    [details, setDetails] = useState(false),
    [fxError, setFxError] = useState("");
  useEffect(() => {
    if (
      t.activeScreen === "Gastos" &&
      t.focus.startsWith("new") &&
      !consumed.current.has(t.focus)
    ) {
      consumed.current.add(t.focus);
      setEditing(null);
    }
  }, [t.focus, t.activeScreen]);
  const budget = ofKind(t.records, "budget")[0],
    currency = budget?.data.currency ?? "USD";
  useEffect(() => {
    let alive = true;
    setFactor(currency === "USD" ? 1 : null);
    void providers.fx
      .rate("USD", currency)
      .then((q) => {
        if (alive) {
          setFactor(q.rate);
          setFxError("");
        }
      })
      .catch((e) => {
        if (alive) {
          setFactor(null);
          setFxError(e.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [currency]);
  const list = ofKind(t.records, "expense").filter(
    (e) => filter === "Todas" || e.data.category === filter,
  );
  const displayCurrency = factor === null ? "USD" : currency;
  const conversionReady = factor !== null;
  const multiplier = factor ?? 1;
  const total = totals(t.records) * multiplier,
    limit = budget?.data.total ?? 0,
    net = balances(t.records);
  return (
    <Page
      title="Gastos"
      subtitle="Seu orçamento, com clareza em cada moeda."
      back="Mais"
      action={
        <AddButton label="Registrar gasto" onClick={() => setEditing(null)} />
      }
    >
      {fxError && (
        <p role="status">{fxError} Totais em USD até atualizar a taxa.</p>
      )}
      <Card className="budget-card">
        <div className="section-heading">
          <span>Orçamento total</span>
          <Button variant="ghost" onClick={() => setBudgetOpen(true)}>
            Editar orçamento
          </Button>
        </div>
        <span className="muted">Gasto</span>
        <h2 className="large-number">{money(total, displayCurrency)}</h2>
        <p>
          de {money(limit, currency)} ·{" "}
          {conversionReady && limit
            ? `${Math.round((total / limit) * 100)}%`
            : "—"}
        </p>
        <progress
          value={conversionReady ? Math.min(total, limit) : 0}
          max={limit || 1}
          aria-label="Orçamento utilizado"
        />
        <p className={total > limit ? "warning" : ""}>
          {!conversionReady
            ? "Saldo indisponível até obter a cotação."
            : limit
              ? `${total > limit ? "Acima do orçamento" : "Restante"}: ${money(Math.abs(limit - total), currency)}`
              : "Defina seu orçamento para acompanhar o saldo."}
        </p>
        <small>Cada gasto preserva a taxa registrada para USD.</small>
      </Card>
      <button
        className="text-button"
        aria-expanded={details}
        onClick={() => setDetails(!details)}
      >
        {details ? "Menos detalhes ↑" : "Mais detalhes ↓"}
      </button>
      {details && (
        <Card>
          <h2>Por categoria</h2>
          {expenseCategories.map((category) => {
            const amount =
              ofKind(t.records, "expense")
                .filter((e) => e.data.category === category)
                .reduce((n, e) => n + e.data.amount * e.data.rate, 0) *
              multiplier;
            const cap = conversionReady
              ? (budget?.data.categories[category] ?? 0)
              : 0;
            return (
              <div className="category-row" key={category}>
                <div className="section-heading">
                  <span>{category}</span>
                  <strong>
                    {money(amount, displayCurrency)} ·{" "}
                    {total ? Math.round((amount / total) * 100) : 0}%
                  </strong>
                </div>
                <progress
                  value={Math.min(amount, cap || total || 1)}
                  max={cap || total || 1}
                  aria-label={`Gastos em ${category}`}
                />
                {cap > 0 && (
                  <small>
                    Limite: {money(cap, currency)}{" "}
                    {amount > cap ? "· limite excedido" : ""}
                  </small>
                )}
              </div>
            );
          })}
        </Card>
      )}
      <Segments
        value={filter}
        onChange={setFilter}
        label="Filtrar gastos"
        options={["Todas", ...expenseCategories].map((value) => ({
          value,
          label: value,
        }))}
      />
      {!list.length && <Empty title="Nenhum gasto nesta categoria" />}
      {list.map((e) => (
        <Card
          key={e.id}
          className={`expense-card ${t.focus === e.id ? "focused-record" : ""}`}
        >
          <div className="section-heading">
            <h3>{e.data.title}</h3>
            <strong>{money(e.data.amount, e.data.currency)}</strong>
          </div>
          <p>
            {e.data.date} · {e.data.category}
          </p>
          <small>
            Pago por{" "}
            {t.trip.members.find((m) => m.userId === e.data.payer)
              ?.displayName ?? "Viajante"}
            {e.data.split.length
              ? ` · dividido entre ${e.data.split.length}`
              : " · sem divisão"}
          </small>
          <p>{e.data.notes}</p>
          <RecordActions record={e} onEdit={() => setEditing(e)} />
        </Card>
      ))}
      <Card>
        <h2>Saldo entre viajantes</h2>
        <p>
          Somente despesas com divisão. Positivo = tem a receber; negativo =
          deve ao grupo.
        </p>
        {Object.entries(net).length ? (
          Object.entries(net).map(([id, amount]) => (
            <div className="section-heading" key={id}>
              <span>
                {t.trip.members.find((m) => m.userId === id)?.displayName ??
                  "Viajante"}
              </span>
              <strong>{money(amount * multiplier, displayCurrency)}</strong>
            </div>
          ))
        ) : (
          <p>Nenhuma divisão registrada.</p>
        )}
      </Card>
      {editing !== undefined && (
        <RecordEditor
          kind="expense"
          record={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}{" "}
      {budgetOpen && (
        <RecordEditor
          kind="budget"
          record={budget}
          initial={budget ? {} : { title: "Orçamento da viagem" }}
          onClose={() => setBudgetOpen(false)}
        />
      )}
    </Page>
  );
}
export function Shopping() {
  const consumed = useRef(new Set<string>());
  const t = useTravel();
  const [tab, setTab] = useState<"wishlist" | "bought">("wishlist"),
    [editing, setEditing] = useState<Entity<"shopping"> | null | undefined>(),
    [buy, setBuy] = useState<Entity<"shopping"> | null>(null),
    [price, setPrice] = useState(0),
    [expense, setExpense] = useState(true),
    [buyCurrency, setBuyCurrency] = useState(t.trip.currency),
    [manualRate, setManualRate] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (
      t.activeScreen === "Compras" &&
      t.focus.startsWith("new") &&
      !consumed.current.has(t.focus)
    ) {
      consumed.current.add(t.focus);
      setEditing(null);
    }
  }, [t.focus, t.activeScreen]);
  const items = ofKind(t.records, "shopping").filter(
    (s) => s.data.bought === (tab === "bought"),
  );
  return (
    <Page
      title="Compras"
      subtitle="Wishlist e compras realizadas."
      back="Mais"
      action={
        <AddButton label="Adicionar produto" onClick={() => setEditing(null)} />
      }
    >
      <Segments
        label="Status das compras"
        value={tab}
        onChange={setTab}
        options={[
          { value: "wishlist", label: "Wishlist" },
          { value: "bought", label: "Comprados" },
        ]}
      />
      {!items.length && <Empty />}
      {items.map((s) => (
        <Card
          key={s.id}
          className={`shopping-card ${t.focus === s.id ? "focused-record" : ""}`}
        >
          <div className="product-row">
            {s.data.photoIds?.[0] ? (
              <MediaImage id={s.data.photoIds[0]} thumb alt={s.data.title} />
            ) : s.data.image ? (
              <img
                src={s.data.image}
                alt={s.data.title}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="product-placeholder">
                <ShoppingBag />
              </div>
            )}
            <div>
              <h3>{s.data.title}</h3>
              <p>
                {s.data.brand} · {s.data.store}
              </p>
              <strong className="blue">
                {money(
                  s.data.bought ? s.data.actualPrice : s.data.price,
                  s.data.currency,
                )}
              </strong>
              <small>
                {s.data.size && `Tamanho ${s.data.size} · `}Prioridade{" "}
                {s.data.priority === "high"
                  ? "alta"
                  : s.data.priority === "low"
                    ? "baixa"
                    : "média"}
              </small>
            </div>
          </div>
          <p>{s.data.notes}</p>
          {!s.data.bought && (
            <Button
              onClick={() => {
                setBuy(s);
                setPrice(s.data.price);
                setBuyCurrency(s.data.currency);
                setManualRate(0);
                setError("");
              }}
            >
              <Check size={17} />
              Comprei
            </Button>
          )}
          {s.data.url && (
            <a
              className="text-button"
              href={safeUrl(s.data.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir produto ↗
            </a>
          )}
          {s.data.bought && (
            <button
              className="text-button"
              onClick={() => t.navigate("Bagagem")}
            >
              {s.data.bagId
                ? "Ver mala da volta"
                : "Ainda sem mala · organizar retorno"}
            </button>
          )}
          <RecordActions record={s} onEdit={() => setEditing(s)} />
        </Card>
      ))}
      {editing !== undefined && (
        <RecordEditor
          kind="shopping"
          record={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}{" "}
      {buy && (
        <Modal
          title={`Comprei · ${buy.data.title}`}
          onClose={() => setBuy(null)}
        >
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              void (async () => {
                try {
                  const q =
                    manualRate > 0
                      ? { rate: manualRate }
                      : await providers.fx.rate(buyCurrency, "USD");
                  await t.commit(
                    purchaseChanges(
                      buy,
                      price,
                      true,
                      buyCurrency,
                      q.rate,
                      t.date,
                      t.records,
                      t.trip,
                      t.user,
                    ),
                    "Compra registrada",
                  );
                  setBuy(null);
                  setTab("bought");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            <label>
              Preço real ({buyCurrency})
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </label>
            <label>
              Moeda
              <select
                value={buyCurrency}
                onChange={(e) => {
                  setBuyCurrency(e.target.value);
                  setManualRate(0);
                }}
              >
                {["USD", "BRL", "EUR", "GBP", "CAD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Taxa para USD (opcional · usar se a cotação estiver indisponível)
              <input
                type="number"
                min="0"
                step="any"
                value={manualRate || ""}
                onChange={(e) => setManualRate(Number(e.target.value))}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={!buy.data.returnOptOut}
                onChange={(e) =>
                  setBuy({
                    ...buy,
                    data: {
                      ...buy.data,
                      returnOptOut: !e.target.checked,
                      physical: true,
                    },
                  })
                }
              />
              Incluir na bagagem de retorno
            </label>
            <small>
              Compra e gasto são salvos juntos. Repetir não duplica o gasto
              vinculado.
            </small>
            {error && <p role="alert">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Confirmar compra"}
            </Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
export function Luggage() {
  const t = useTravel();
  const [traveler, setTraveler] = useState(t.user.id),
    [returning, setReturning] = useState(t.focus === "return"),
    [editing, setEditing] = useState<AnyEntity | null | undefined>(),
    [kind, setKind] = useState<"bag" | "packing">("bag"),
    [bagId, setBagId] = useState("");
  const bags = ofKind(t.records, "bag").filter(
      (b) => b.data.traveler === traveler,
    ),
    packing = ofKind(t.records, "packing").filter(
      (p) => p.data.traveler === traveler,
    );
  useEffect(() => {
    if (t.activeScreen === "Bagagem" && t.focus === "return")
      setReturning(true);
  }, [t.focus, t.activeScreen]);
  const purchases = ofKind(t.records, "shopping").filter(
    (s) => s.data.bought && !s.data.returnOptOut && s.data.physical !== false,
  );
  const run = (f: () => Promise<void>) => {
    void f().catch((e) => t.notify(message(e)));
  };
  return (
    <Page
      title="Bagagem"
      subtitle="Itens de ida e de retorno."
      back="Mais"
      action={
        <AddButton
          label="Criar mala"
          onClick={() => {
            setKind("bag");
            setEditing(null);
          }}
        />
      }
    >
      <Segments
        label="Viajante"
        value={traveler}
        onChange={setTraveler}
        options={t.trip.members.map((m) => ({
          value: m.userId,
          label: m.displayName,
        }))}
      />
      <Segments
        label="Modo de arrumação"
        value={returning ? "return" : "outbound"}
        onChange={(v) => setReturning(v === "return")}
        options={[
          { value: "outbound", label: "Arrumar para ir" },
          { value: "return", label: "Arrumar para voltar" },
        ]}
      />
      {!bags.length && <Empty title="Nenhuma mala deste viajante" />}
      {bags.map((b) => {
        const items = packing.filter((p) => p.data.bagId === b.id);
        const weight =
          items.reduce((n, p) => n + p.data.weight * p.data.quantity, 0) +
          (returning
            ? purchases
                .filter((s) => s.data.bagId === b.id)
                .reduce((n, s) => n + s.data.weight * (s.data.quantity ?? 1), 0)
            : 0);
        return (
          <Card key={b.id} className="bag-card">
            <div className="section-heading">
              <Briefcase className="blue" />
              <span>
                {b.data.type === "checked"
                  ? "Despachada"
                  : b.data.type === "cabin"
                    ? "Mala de mão"
                    : "Mochila"}
              </span>
            </div>
            <h2>{b.data.title}</h2>
            <h3 className="large-number">
              {b.data.actualWeight} / {b.data.limit} kg
            </h3>
            <progress
              value={Math.min(b.data.actualWeight, b.data.limit)}
              max={b.data.limit || 1}
              aria-label={`Peso da ${b.data.title}`}
            />
            <p>
              Itens estimados: {weight.toFixed(1)} kg ·{" "}
              {
                items.filter((p) =>
                  returning ? p.data.returnPacked : p.data.packed,
                ).length
              }
              /{items.length} arrumados
            </p>
            {Math.max(weight, b.data.actualWeight) > b.data.limit && (
              <p className="warning">O peso ultrapassa o limite informado.</p>
            )}
            {items.map((p) => (
              <div key={p.id} className="check-item">
                <label>
                  <input
                    type="checkbox"
                    checked={returning ? p.data.returnPacked : p.data.packed}
                    onChange={(e) =>
                      run(() =>
                        t.save({
                          ...p,
                          data: {
                            ...p.data,
                            [returning ? "returnPacked" : "packed"]:
                              e.target.checked,
                          },
                        }),
                      )
                    }
                  />
                  <span>
                    <strong>{p.data.title}</strong>
                    <small>
                      {p.data.category} · {p.data.quantity} × {p.data.weight} kg
                    </small>
                  </span>
                </label>
                <RecordActions
                  record={p}
                  onEdit={() => {
                    setKind("packing");
                    setEditing(p);
                  }}
                />
              </div>
            ))}
            {returning &&
              purchases
                .filter((s) => s.data.bagId === b.id)
                .map((s) => (
                  <label key={s.id} className="check-label">
                    <input
                      type="checkbox"
                      checked={!!s.data.returnPacked}
                      onChange={(e) =>
                        run(() =>
                          t.save({
                            ...s,
                            data: { ...s.data, returnPacked: e.target.checked },
                          }),
                        )
                      }
                    />
                    <span>
                      {s.data.title} ×{s.data.quantity ?? 1} · {s.data.weight}{" "}
                      kg · compra para a volta
                    </span>
                  </label>
                ))}
            <Button
              variant="secondary"
              onClick={() => {
                setKind("packing");
                setBagId(b.id);
                setEditing(null);
              }}
            >
              Adicionar item
            </Button>
            <RecordActions
              record={b}
              onEdit={() => {
                setKind("bag");
                setEditing(b);
              }}
            />
          </Card>
        );
      })}
      {returning && (
        <Card>
          <h2>Compras para levar de volta</h2>
          {purchases.filter((s) => !s.data.bagId).length === 0 ? (
            <p>Todas as compras estão associadas a uma mala.</p>
          ) : (
            purchases
              .filter((s) => !s.data.bagId)
              .map((s) => (
                <label key={s.id}>
                  {s.data.title} ×{s.data.quantity ?? 1}
                  <span className="check-label">
                    <input
                      type="checkbox"
                      aria-label={`Preparado para retorno: ${s.data.title}`}
                      checked={!!s.data.returnPacked}
                      onChange={(e) =>
                        run(() =>
                          t.save({
                            ...s,
                            data: { ...s.data, returnPacked: e.target.checked },
                          }),
                        )
                      }
                    />
                    Preparado para o retorno
                  </span>
                  <select
                    aria-label={`Mala para ${s.data.title}`}
                    value=""
                    onChange={(e) =>
                      run(() =>
                        t.save({
                          ...s,
                          data: { ...s.data, bagId: e.target.value },
                        }),
                      )
                    }
                  >
                    <option value="">Ainda sem mala</option>
                    {bags.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.data.title}
                      </option>
                    ))}
                  </select>
                </label>
              ))
          )}
        </Card>
      )}
      {packing.some((p) => !p.data.bagId) && (
        <Card>
          <h3>Itens sem mala</h3>
          {packing
            .filter((p) => !p.data.bagId)
            .map((p) => (
              <button
                key={p.id}
                className="map-list-item"
                onClick={() => {
                  setKind("packing");
                  setEditing(p);
                }}
              >
                {p.data.title} · escolher mala
              </button>
            ))}
        </Card>
      )}
      {editing !== undefined && (
        <RecordEditor
          kind={kind}
          record={editing ?? undefined}
          initial={editing ? {} : { traveler, bagId }}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Page>
  );
}
export function ChecklistScreen() {
  const t = useTravel();
  const [phase, setPhase] = useState("before"),
    [editing, setEditing] = useState<Entity<"checklist"> | null | undefined>();
  const list = ofKind(t.records, "checklist").filter(
      (c) => c.data.phase === phase,
    ),
    done = list.filter((c) => c.data.done).length;
  const run = (f: () => Promise<void>) => {
    void f().catch((e) => t.notify(message(e)));
  };
  return (
    <Page
      title="Checklist"
      subtitle="Pequenos preparativos. Uma viagem mais tranquila."
      back="Mais"
      action={
        <AddButton label="Adicionar tarefa" onClick={() => setEditing(null)} />
      }
    >
      <Card>
        <h2>
          {done} de {list.length} concluídos
        </h2>
        <progress
          value={done}
          max={list.length || 1}
          aria-label="Progresso do checklist"
        />
      </Card>
      <Segments
        label="Fase do checklist"
        value={phase}
        onChange={setPhase}
        options={[
          { value: "before", label: "Antes da viagem" },
          { value: "during", label: "Durante" },
          { value: "return", label: "Retorno" },
        ]}
      />
      {!list.length && <Empty />}
      {list.map((c) => (
        <Card key={c.id}>
          <div className="check-item">
            <label>
              <input
                type="checkbox"
                checked={c.data.done}
                onChange={(e) =>
                  run(() =>
                    t.save({
                      ...c,
                      data: { ...c.data, done: e.target.checked },
                    }),
                  )
                }
              />
              <span>
                <strong>{c.data.title}</strong>
                <small>
                  {
                    t.trip.members.find((m) => m.userId === c.data.assignee)
                      ?.displayName
                  }{" "}
                  · {c.data.due || "Sem prazo"}
                  {c.data.suggested ? " · sugestão aceita" : ""}
                </small>
              </span>
            </label>
          </div>
          <RecordActions record={c} onEdit={() => setEditing(c)} />
        </Card>
      ))}
      <Card>
        <h3>Sugestão para esta fase</h3>
        <p>
          {phase === "before"
            ? "Separar carregadores e adaptadores"
            : phase === "during"
              ? "Conferir o próximo horário fixo"
              : "Conferir documentos e objetos no hotel"}
        </p>
        <Button
          variant="secondary"
          onClick={() =>
            run(() =>
              t.save(
                t.make("checklist", {
                  title:
                    phase === "before"
                      ? "Separar carregadores e adaptadores"
                      : phase === "during"
                        ? "Conferir o próximo horário fixo"
                        : "Conferir documentos e objetos no hotel",
                  phase: phase as "before",
                  due: phase === "return" ? t.trip.endDate : t.date,
                  assignee: t.user.id,
                  done: false,
                  suggested: true,
                }),
              ),
            )
          }
        >
          Adicionar sugestão
        </Button>
      </Card>
      {editing !== undefined && (
        <RecordEditor
          kind="checklist"
          record={editing ?? undefined}
          initial={editing ? {} : { phase }}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Page>
  );
}
export function Documents() {
  const t = useTravel();
  const [visibility, setVisibility] = useState("all"),
    [editing, setEditing] = useState<Entity<"document"> | null | undefined>(),
    [preview, setPreview] = useState<{
      url: string;
      text?: string;
      mime: string;
      title: string;
    } | null>(null),
    [busy, setBusy] = useState("");
  const docs = ofKind(t.records, "document").filter((d) =>
    documentFilter(d.data.category, visibility, d.data.customType),
  );
  async function open(d: Entity<"document">) {
    setBusy(d.id);
    try {
      const blob = await documentBlob(d, t.trip, t.user);
      setPreview({
        url: URL.createObjectURL(blob),
        mime: blob.type,
        title: d.data.title,
        text: blob.type.startsWith("text/") ? await blob.text() : undefined,
      });
    } catch (e) {
      t.notify(message(e));
    } finally {
      setBusy("");
    }
  }
  function close() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }
  return (
    <Page
      title="Documentos"
      subtitle="Anexos salvos neste dispositivo."
      back="Mais"
      action={
        <AddButton
          label="Adicionar documento"
          onClick={() => setEditing(null)}
        />
      }
    >
      <DropdownFilter
        label="Todos os documentos"
        value={visibility}
        onChange={setVisibility}
        options={[
          ["all", "Todos"],
          ...documentTypes,
          ...Array.from(
            new Set(
              ofKind(t.records, "document")
                .map((d) => d.data.customType)
                .filter(Boolean),
            ),
          ).map((v) => [`custom:${v}`, v!] as [string, string]),
        ]}
      />
      {!docs.length && (
        <Empty
          title="Nenhum documento disponível"
          text="Adicione um documento com foto ou arquivo."
        />
      )}
      {t.focus && !docs.some((d) => d.id === t.focus) && (
        <p className="notice">
          O documento solicitado não está disponível para sua conta.
        </p>
      )}
      {docs.map((d) => (
        <Card
          key={d.id}
          className={`document-card ${t.focus === d.id ? "focused-record" : ""}`}
        >
          <div className="section-heading">
            <FileText className="blue" />
            {d.visibility === "private" ? (
              <span>
                <Lock size={13} /> Só eu
              </span>
            ) : (
              <span>
                <Users size={13} /> Viagem
              </span>
            )}
          </div>
          <h3>{d.data.title}</h3>
          <p>
            {d.data.expires
              ? `Validade: ${d.data.expires}`
              : "Sem validade cadastrada"}
            {d.data.fictitious ? " · FICTÍCIO" : ""}
          </p>
          <small>{d.data.fileName || "Nota documental sem arquivo"}</small>
          <div className="action-row">
            <Button
              variant="secondary"
              disabled={busy === d.id}
              onClick={() => {
                void open(d);
              }}
            >
              Visualizar
            </Button>
          </div>
          <small>
            {d.data.fictitious
              ? "Registro de exemplo preservado da versão anterior."
              : "Arquivo local · disponível sem conexão após importação."}
          </small>
          <RecordActions record={d} onEdit={() => setEditing(d)} />
        </Card>
      ))}
      {editing !== undefined && (
        <RecordEditor
          kind="document"
          record={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}{" "}
      {preview && (
        <Modal title={preview.title} onClose={close}>
          {preview.text !== undefined ? (
            <pre className="document-note">{preview.text}</pre>
          ) : preview.mime.startsWith("image/") ? (
            <img
              className="document-image"
              src={preview.url}
              alt={preview.title}
            />
          ) : (
            <iframe
              className="document-frame"
              title={preview.title}
              src={preview.url}
            />
          )}
          <a
            className="button secondary"
            href={preview.url}
            download={preview.title}
          >
            Baixar arquivo
          </a>
        </Modal>
      )}
    </Page>
  );
}
export function Memories() {
  const t = useTravel();
  const [editing, setEditing] = useState<Entity<"memory"> | null | undefined>(),
    [noteEditor, setNoteEditor] = useState<Entity<"note"> | null | undefined>(),
    [filter, setFilter] = useState("all"),
    [uploading, setUploading] = useState("");
  const memories = ofKind(t.records, "memory")
    .filter((m) => filter === "all" || m.data.favorite)
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const completed = ofKind(t.records, "activity").filter(
    (a) => a.data.status === "done",
  );
  async function addPhoto(memory: Entity<"memory">, file: File) {
    setUploading(memory.id);
    try {
      const uploaded = await uploadFile(file, t.trip, t.user);
      const doc = t.make(
        "document",
        {
          title: `Foto · ${memory.data.title}`,
          category: "other",
          expires: "",
          notes: "Foto de memória",
          ...uploaded,
          essential: true,
          fictitious: false,
        },
        memory.visibility,
      );
      await t.commit(
        [
          change(doc),
          change({
            ...memory,
            data: {
              ...memory.data,
              photoIds: [...memory.data.photoIds, doc.id],
            },
          }),
        ],
        "Foto adicionada",
      );
    } catch (e) {
      t.notify(message(e));
    } finally {
      setUploading("");
    }
  }
  return (
    <Page
      title="Memórias"
      subtitle="Guarde o que fez a viagem ser sua."
      back="Mais"
      action={
        <AddButton label="Adicionar memória" onClick={() => setEditing(null)} />
      }
    >
      <Card>
        <h2>Sua retrospectiva</h2>
        <div className="summary-grid">
          <span>
            <strong>{new Set(completed.map((a) => a.data.date)).size}</strong>
            Dias vividos
          </span>
          <span>
            <strong>
              {
                new Set(completed.map((a) => a.data.placeId).filter(Boolean))
                  .size
              }
            </strong>
            Lugares
          </span>
          <span>
            <strong>
              {memories.reduce((n, m) => n + m.data.photoIds.length, 0)}
            </strong>
            Fotos
          </span>
        </div>
        <p>
          {t.trip.destinations.length} destinos planejados ·{" "}
          {
            completed.filter(
              (a) =>
                places.find((p) => p.id === a.data.placeId)?.category ===
                "photos",
            ).length
          }{" "}
          visitas a photo spots · {money(totals(t.records))} em gastos visíveis
          · {ofKind(t.records, "shopping").filter((s) => s.data.bought).length}{" "}
          compras
        </p>
      </Card>
      <div className="action-row">
        <Button variant="secondary" onClick={() => setNoteEditor(null)}>
          Anotar algo
        </Button>
      </div>
      {ofKind(t.records, "note").map((n) => (
        <Card key={n.id}>
          <small>{n.data.date} · Nota</small>
          <h3>{n.data.title}</h3>
          <p>{n.data.notes}</p>
          <RecordActions record={n} onEdit={() => setNoteEditor(n)} />
        </Card>
      ))}
      {noteEditor !== undefined && (
        <RecordEditor
          kind="note"
          record={noteEditor ?? undefined}
          onClose={() => setNoteEditor(undefined)}
        />
      )}
      <Segments
        label="Filtrar memórias"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Diário e fotos" },
          { value: "favorites", label: "Favoritos" },
        ]}
      />
      {!memories.length && <Empty />}
      {memories.map((m) => (
        <Card key={m.id}>
          <div className="section-heading">
            <small>{m.data.date}</small>
            <button
              className="icon-button"
              aria-label={`Favoritar ${m.data.title}`}
              onClick={() => {
                void t
                  .save({
                    ...m,
                    data: { ...m.data, favorite: !m.data.favorite },
                  })
                  .catch((e) => t.notify(message(e)));
              }}
            >
              <Heart fill={m.data.favorite ? "currentColor" : "none"} />
            </button>
          </div>
          <h2>{m.data.title}</h2>
          <p className="sun">{"★".repeat(m.data.rating)}</p>
          <p>{m.data.notes}</p>
          <div className="memory-gallery">
            {m.data.photoIds.map((id) => (
              <MemoryPhoto key={id} id={id} />
            ))}
          </div>
          {m.data.placeId && (
            <button
              className="text-button"
              onClick={() => t.navigate("Explorar", m.data.placeId)}
            >
              {places.find((p) => p.id === m.data.placeId)?.name} ↗
            </button>
          )}
          <label className="upload-button">
            <Camera size={17} />
            {uploading === m.id ? "Enviando…" : "Adicionar foto"}
            <input
              type="file"
              disabled={!!uploading}
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) void addPhoto(m, e.target.files[0]);
              }}
            />
          </label>
          <RecordActions record={m} onEdit={() => setEditing(m)} />
        </Card>
      ))}
      {editing !== undefined && (
        <RecordEditor
          kind="memory"
          record={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Page>
  );
}
function MemoryPhoto({ id }: { id: string }) {
  const t = useTravel(),
    [url, setUrl] = useState("");
  useEffect(() => {
    let active = true,
      value = "";
    const doc = ofKind(t.records, "document").find((d) => d.id === id);
    if (doc)
      void documentBlob(doc, t.trip, t.user)
        .then((blob) => {
          value = URL.createObjectURL(blob);
          if (active) setUrl(value);
          else URL.revokeObjectURL(value);
        })
        .catch(() => {});
    return () => {
      active = false;
      if (value) URL.revokeObjectURL(value);
    };
  }, [id]);
  return url ? (
    <img src={url} alt="Foto da memória" />
  ) : (
    <span className="photo-unavailable">Foto não disponível offline</span>
  );
}
export function safeUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "#";
  } catch {
    return "#";
  }
}
