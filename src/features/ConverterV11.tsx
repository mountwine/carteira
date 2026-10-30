import { useEffect, useState } from "react";
import { Page, Segments } from "../components/forms";
import { currencies } from "../components/local";
import { currentRate, type FxQuote } from "../adapters/external";
import { convert, unitGroups } from "../domain/conversions";
const categories: [string, string][] = [
  ["currency", "💱 Moeda"],
  ["distance", "📏 Distância"],
  ["length", "📐 Comprimento"],
  ["weight", "⚖️ Peso"],
  ["temperature", "🌡️ Temperatura"],
  ["shoe-men", "👟 Calçado masculino"],
  ["shoe-women", "👠 Calçado feminino"],
  ["shirt", "👕 Camisa/Camiseta"],
  ["pants", "👖 Calça"],
  ["clothes", "🧥 Roupas"],
  ["ring", "💍 Anel"],
  ["luggage", "🧳 Bagagem"],
  ["volume", "Volume"],
  ["fuel", "Consumo"],
];
const unitsFor = (category: string) =>
  category === "currency"
    ? currencies
    : category === "temperature"
      ? ["°C", "°F"]
      : category === "fuel"
        ? ["km/L", "MPG (US)"]
        : category in unitGroups
          ? Object.keys(unitGroups[category as keyof typeof unitGroups].units)
          : ["BR", "US", "EU", "UK"];
export function ConverterV11() {
  const [category, setCategory] = useState("currency"),
    [from, setFrom] = useState("BRL"),
    [to, setTo] = useState("USD"),
    [amount, setAmount] = useState("1"),
    [quote, setQuote] = useState<FxQuote | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const units = unitsFor(category);
  useEffect(() => {
    setQuote(null);
    setError("");
    if (category !== "currency") return;
    let alive = true;
    setLoading(true);
    void currentRate(from, to)
      .then((q) => {
        if (alive) setQuote(q);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [category, from, to]);
  let result = "";
  const physical = [
    "distance",
    "length",
    "weight",
    "temperature",
    "volume",
    "fuel",
  ].includes(category);
  if (amount !== "" && Number.isFinite(Number(amount))) {
    if (category === "currency" && quote)
      result = (Number(amount) * quote.rate).toLocaleString("pt-BR", {
        maximumFractionDigits: 4,
      });
    else if (physical)
      result = convert(
        Number(amount),
        from,
        to,
        category as Parameters<typeof convert>[3],
      ).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }
  const shoe = category.includes("shoe"),
    pants = category === "pants";
  const columns = shoe
    ? ["BR", "US", "Pé (cm)"]
    : pants
      ? ["BR", "US", "Cintura (cm)"]
      : ["BR", "US", "Peito (cm)"];
  const table =
    category === "shoe-men"
      ? [
          ["37", "6", "23,7"],
          ["38", "7", "24,5"],
          ["39", "7,5", "25,0"],
          ["40", "8,5", "25,8"],
          ["41", "9,5", "26,7"],
          ["42", "10", "27,1"],
        ]
      : category === "shoe-women"
        ? [
            ["35", "6", "22,9"],
            ["36", "7", "23,7"],
            ["37", "7,5", "24,1"],
            ["38", "8,5", "25,0"],
            ["39", "9", "25,4"],
            ["40", "10", "26,2"],
          ]
        : pants
          ? [
              ["PP", "XS", "65–73"],
              ["P", "S", "73–81"],
              ["M", "M", "81–89"],
              ["G", "L", "89–97"],
              ["GG", "XL", "97–109"],
            ]
          : [
              ["PP", "XS", "80–88"],
              ["P", "S", "88–96"],
              ["M", "M", "96–104"],
              ["G", "L", "104–112"],
              ["GG", "XL", "112–124"],
            ];
  return (
    <Page
      title="Conversor"
      subtitle="Moedas, medidas e referências de tamanhos."
      back="Mais"
    >
      <Segments
        label="Tipo de conversão"
        value={category}
        options={categories.map(([value, label]) => ({
          value,
          label: label.replace(/^[^\p{L}\p{N}]+/u, ""),
        }))}
        onChange={(v) => {
          setCategory(v);
          const next = unitsFor(v);
          setFrom(next[0]);
          setTo(next[1]);
          setAmount("1");
        }}
      />
      {category === "luggage" ? (
        <>
          <UnitPair group="weight" from="kg" to="lb" />
          <UnitPair group="length" from="cm" to="in" />
        </>
      ) : category === "ring" ? (
        <section className="card">
          <h2>Anel · medidas</h2>
          <label>
            Diâmetro interno (mm)
            <input
              type="number"
              min="0"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <p>Circunferência: {(Number(amount) * Math.PI).toFixed(1)} mm</p>
          <small>
            O tamanho EU corresponde aproximadamente à circunferência em
            milímetros. BR e US dependem da tabela do fabricante.
          </small>
          <a
            className="text-button"
            href="https://us.pandora.net/en/guide-size-rings/guide-size-rings.html"
            target="_blank"
            rel="noreferrer"
          >
            Consultar guia de anéis
          </a>
        </section>
      ) : category === "currency" || physical ? (
        <section className="card converter">
          <label>
            Valor
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <div className="conversion-pair">
            <label>
              De
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
            <button
              aria-label="Inverter conversão"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              ⇄
            </button>
            <label>
              Para
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <strong className="large-number">
            {result || "—"} {to}
          </strong>
          {loading && <p role="status">Atualizando cotação…</p>}
          {error && <p role="status">{error}</p>}
          {quote && category === "currency" && (
            <>
              <p>
                1 {from} ={" "}
                {quote.rate.toLocaleString("pt-BR", {
                  maximumFractionDigits: 6,
                })}{" "}
                {to}
              </p>
              <small>
                {quote.cached ? "Última atualização" : "Atualização"}:{" "}
                {new Date(quote.fetchedAt).toLocaleString("pt-BR")} · referência
                de {quote.date}
              </small>
              <p className="muted">
                Frankfurter · cotação de referência de mercado. Sem IOF ou
                spread; não é o custo final do cartão.
              </p>
            </>
          )}
        </section>
      ) : (
        <section className="card">
          <h2>Referência aproximada</h2>
          <p>Os tamanhos podem variar por marca.</p>
          <small>
            {category.includes("shoe")
              ? "Referência Nike; confira modelo e comprimento do pé."
              : "Referência Nike masculina; medidas do corpo. Confira corte e medidas na marca."}
          </small>
          <table>
            <thead>
              <tr>
                {columns.map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <a
            className="text-button"
            href="https://static.nike.com.br/web/prd/tabela-de-medidas.html"
            target="_blank"
            rel="noreferrer"
          >
            Fonte: tabela de medidas Nike
          </a>
        </section>
      )}
    </Page>
  );
}
function UnitPair({
  group,
  from,
  to,
}: {
  group: "weight" | "length";
  from: string;
  to: string;
}) {
  const [value, setValue] = useState("1"),
    [reverse, setReverse] = useState(false);
  const a = reverse ? to : from,
    b = reverse ? from : to;
  return (
    <section className="card">
      <label>
        {a}
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <p>
        {convert(Number(value), a, b, group).toLocaleString("pt-BR", {
          maximumFractionDigits: 3,
        })}{" "}
        {b}
      </p>
      <button className="text-button" onClick={() => setReverse(!reverse)}>
        ⇄ Inverter
      </button>
    </section>
  );
}
