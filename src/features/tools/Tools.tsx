import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Volume2,
  Phone,
  Shield,
  FileText,
  Search,
  ExternalLink,
} from "lucide-react";
import { useTravel, type Screen } from "../../data/TravelContext";
import { Page, Segments, RecordEditor, Empty } from "../../components/forms";
import { Button, Card } from "../../components/ui";
import {
  unitGroups,
  convert,
  shoeRows,
  clothingRows,
} from "../../domain/conversions";
import {
  providers,
  phrasebook,
  normalize,
  places,
} from "../../adapters/providers";
import { ofKind, type Kind, type AnyEntity } from "../../domain/entities";
import { message } from "../../data/engine";
export function SOS() {
  const t = useTravel();
  const [editing, setEditing] = useState(false);
  const emergency = ofKind(t.records, "emergency").find(
    (e) => e.ownerId === t.user.id,
  );
  const hotel = ofKind(t.records, "reservation").find(
    (r) =>
      r.data.category === "hotel" &&
      r.data.status === "confirmed" &&
      r.data.date <= t.date &&
      (!r.data.endDate || r.data.endDate >= t.date),
  );
  const destination =
    t.trip.destinations.find(
      (d) => t.date >= d.startDate && t.date <= d.endDate,
    ) ?? t.trip.destinations[0];
  const us =
    destination?.country === "Estados Unidos" ||
    ["Los Angeles", "Las Vegas", "Orlando"].includes(destination?.city ?? "");
  return (
    <Page title="SOS" subtitle="Informações essenciais à mão." back="Mais">
      <Card>
        <h2>
          <Shield size={20} /> Seguro e contato
        </h2>
        {emergency ? (
          <>
            <p>
              {emergency.data.insurance} · {emergency.data.policy}
            </p>
            {emergency.data.insurancePhone && (
              <a href={`tel:${emergency.data.insurancePhone}`}>
                Ligar para seguradora
              </a>
            )}
            <p>{emergency.data.contactName}</p>
            {emergency.data.contactPhone && (
              <a href={`tel:${emergency.data.contactPhone}`}>
                {emergency.data.contactPhone}
              </a>
            )}
            <p>{emergency.data.medicalNotes}</p>
          </>
        ) : (
          <p>Cadastre os contatos que deseja levar offline.</p>
        )}
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Editar informações pessoais
        </Button>
      </Card>
      <Card>
        <h2>Hospedagem atual</h2>
        {hotel ? (
          <>
            <p>{hotel.data.title}</p>
            <p>{hotel.data.address}</p>
            <button
              className="text-button"
              onClick={() => t.navigate("Reservas", hotel.id)}
            >
              Abrir reserva
            </button>
          </>
        ) : (
          <p>Nenhuma hospedagem confirmada para esta data.</p>
        )}
      </Card>
      <Card>
        <h2>Consulado / embaixada</h2>
        <p>
          {emergency?.data.consulateName ||
            "Consulte a repartição responsável pelo seu destino."}
        </p>
        <p>{emergency?.data.consulateAddress}</p>
        {emergency?.data.consulatePhone && (
          <a href={`tel:${emergency.data.consulatePhone}`}>
            {emergency.data.consulatePhone}
          </a>
        )}
        <a
          href="https://www.gov.br/mre/pt-br/assuntos/portal-consular/reparticoes-consulares-do-brasil"
          target="_blank"
          rel="noopener noreferrer"
        >
          Diretório oficial do Itamaraty ↗
        </a>
        <small>
          Diretório externo precisa de internet. Salve o contato em “Editar
          informações pessoais” para acessá-lo offline.
        </small>
      </Card>
      <Card>
        <h2>Cartão de emergência em inglês</h2>
        <p className="emergency-card">
          {emergency?.data.cardEnglish ||
            "I need help. Please contact my emergency contact."}
        </p>
        <small>
          Texto pessoal; confira a tradução antes de usar. Visível somente para
          você.
        </small>
      </Card>
      <Card>
        <h2>Documentos essenciais</h2>
        {ofKind(t.records, "document")
          .filter((d) => d.data.essential)
          .map((d) => (
            <button
              key={d.id}
              className="map-list-item"
              onClick={() => t.navigate("Documentos", d.id)}
            >
              <FileText size={18} />
              {d.data.title}
            </button>
          ))}
        <Button variant="secondary" onClick={() => t.navigate("Documentos")}>
          Preparar documentos offline
        </Button>
      </Card>
      {editing && (
        <RecordEditor
          kind="emergency"
          record={emergency}
          onClose={() => setEditing(false)}
        />
      )}
    </Page>
  );
}
const screens: Partial<Record<Kind, Screen>> = {
  activity: "Roteiro",
  reservation: "Reservas",
  shopping: "Compras",
  document: "Documentos",
  expense: "Gastos",
  bag: "Bagagem",
  packing: "Bagagem",
  checklist: "Hoje",
};
export function searchRecords(records: AnyEntity[], query: string) {
  const q = normalize(query);
  let kind: Kind | undefined;
  if (q.includes("reserva")) kind = "reservation";
  else if (q.includes("compra")) kind = "shopping";
  else if (q.includes("document") || q.includes("passaporte"))
    kind = "document";
  else if (q.includes("gasto")) kind = "expense";
  else if (q.includes("salv")) kind = "saved";
  else if (q.includes("roteiro") || q.includes("atividade")) kind = "activity";
  const tokens = q
    .replace(
      /reservas?|compras?|documentos?|gastos?|salvos?|roteiro|atividades?|que|ainda|faltam|restaurantes?|\bde\b|\bem\b|\bos\b|\bas\b/g,
      " ",
    )
    .split(/\s+/)
    .filter(Boolean);
  return records
    .filter(
      (r) =>
        !r.deleted &&
        !!screens[r.kind] &&
        (!kind || r.kind === kind) &&
        (q.includes("faltam") ? r.kind === "shopping" && !r.data.bought : true),
    )
    .filter((r) => {
      const place =
        r.kind === "saved"
          ? places.find((p) => p.id === r.data.placeId)
          : undefined;
      if (
        q.includes("restaurante") &&
        r.kind === "saved" &&
        place?.category !== "food"
      )
        return false;
      const haystack = normalize(
        JSON.stringify(r.data) + " " + (place?.city ?? ""),
      );
      return tokens.every((token) => haystack.includes(token));
    });
}
export function UniversalSearch() {
  const t = useTravel();
  const [query, setQuery] = useState(t.focus ?? "");
  const matches = query.trim() ? searchRecords(t.records, query) : [];
  const placeMatches: typeof places = [];
  return (
    <Page
      title="Buscar"
      subtitle="Encontre o que já faz parte da sua viagem."
      back="Hoje"
    >
      <div className="search-input">
        <Search size={20} />
        <input
          autoFocus
          aria-label="Busca universal"
          placeholder="Reservas de Orlando, compras que ainda faltam…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {!query && (
        <div className="search-examples">
          {[
            "reservas de Orlando",
            "compras que ainda faltam",
            "restaurantes salvos em Los Angeles",
          ].map((q) => (
            <Button key={q} variant="secondary" onClick={() => setQuery(q)}>
              {q}
            </Button>
          ))}
        </div>
      )}
      {query && !matches.length && !placeMatches.length && (
        <Empty
          title="Nenhum resultado"
          text="Tente outro nome, destino ou tipo de item."
        />
      )}
      {matches.map((r) => (
        <button
          key={r.id}
          className="search-result card"
          onClick={() =>
            t.navigate(
              screens[r.kind]!,
              r.kind === "saved" ? r.data.placeId : r.id,
            )
          }
        >
          <span>
            <strong>{r.data.title}</strong>
            <small>
              {screens[r.kind]} ·{" "}
              {r.visibility === "private" ? "Só eu" : "Viagem"}
            </small>
          </span>
          <ExternalLink size={16} />
        </button>
      ))}
    </Page>
  );
}
