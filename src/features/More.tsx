import { Page } from "../components/forms";
import { useTravel, type Screen } from "../data/TravelContext";
import {
  BriefcaseBusiness,
  CalendarCheck2,
  FileText,
  UsersRound,
  Wallet,
  ShoppingBag,
  ArrowLeftRight,
  ShieldPlus,
  ChevronRight,
} from "lucide-react";
const sections = [
  [
    "Sua viagem",
    [
      ["Reservas", CalendarCheck2, "Voos, hospedagem e experiências"],
      ["Gastos", Wallet, "Orçamento e despesas"],
      ["Compras", ShoppingBag, "Lista e itens comprados"],
      ["Bagagem", BriefcaseBusiness, "Malas e itens por viajante"],
    ],
  ],
  [
    "Informações e ferramentas",
    [
      ["Documentos", FileText, "Arquivos e informações essenciais"],
      ["Viajantes", UsersRound, "Pessoas desta viagem"],
      ["Conversor", ArrowLeftRight, "Moedas, medidas e tamanhos"],
      ["SOS", ShieldPlus, "Seguro, hospedagem e contatos"],
    ],
  ],
] as const;
export function More() {
  const t = useTravel();
  return (
    <Page
      title="Mais"
      subtitle="Tudo o que você precisa para esta viagem, em um só lugar."
    >
      {sections.map(([name, items]) => (
        <section className="more-section" key={name}>
          <h2 className="eyebrow module-section-title">{name}</h2>
          <div className="more-grid">
            {items.map(([label, Icon, description]) => (
              <button
                key={label}
                className="card more-card"
                onClick={() => t.navigate(label as Screen)}
              >
                <span className="more-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <strong>{label}</strong>
                <small>{description}</small>
                <ChevronRight
                  className="more-chevron"
                  size={18}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}
