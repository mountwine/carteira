import { Page } from "../components/forms";
import { useTravel, type Screen } from "../data/TravelContext";
const sections = [
  [
    "Viagem",
    [
      ["Bagagem", "🧳"],
      ["Reservas", "🎟"],
      ["Documentos", "📄"],
      ["Viajantes", "👥"],
    ],
  ],
  [
    "Dinheiro & compras",
    [
      ["Gastos", "💰"],
      ["Compras", "🛍"],
      ["Conversor", "💱"],
    ],
  ],
  ["Segurança", [["SOS", "🆘"]]],
] as const;
export function More() {
  const t = useTravel();
  return (
    <Page title="Mais">
      {sections.map(([name, items]) => (
        <section key={name}>
          <h2 className="eyebrow module-section-title">{name}</h2>
          <div className="more-grid">
            {items.map(([label, icon]) => (
              <button
                key={label}
                className="card more-card"
                onClick={() => t.navigate(label as Screen)}
              >
                <span>{icon}</span>
                <strong>{label}</strong>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}
