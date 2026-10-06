import {
  Sun,
  MapPin,
  Car,
  Camera,
  Clock,
  Wallet,
  Sparkles,
  Bookmark,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  Image,
  Search,
} from "lucide-react";
import { useState } from "react";
import type { Trip, User, HomeContext, HomeData } from "../domain/models";
import { Card, Button, MapsLink } from "../components/ui";
import type { Screen } from "../data/TravelContext";
export function Today({
  trip,
  user,
  context,
  data,
  navigate,
}: {
  trip: Trip;
  user: User;
  context: HomeContext;
  data: HomeData;
  navigate: (t: Screen, focus?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const during = context.phase === "during";
  return (
    <main className="today">
      <section
        className={`hero ${during ? "" : "compact"}`}
        style={{
          backgroundImage: `linear-gradient(180deg,rgba(3,15,28,.08),rgba(3,15,28,.32) 40%,#061321 100%),url("${trip.cover}")`,
        }}
      >
        <div className="hero-meta">
          <span>
            <MapPin size={14} />
            {context.destination?.city ?? "Seu destino"}
            {during && ` · Dia ${context.day} de ${context.totalDays}`}
          </span>
          {data.weather && during && (
            <span>
              <Sun size={18} className="sun" />
              {data.weather.temperature}° <span className="meta-divider" /> Pôr
              do sol {data.weather.sunset}
            </span>
          )}
        </div>
        <div className="hero-title">
          <span className="eyebrow">
            {context.phase === "before"
              ? "A CONTAGEM REGRESSIVA COMEÇOU"
              : during
                ? "VIVA O SEU DIA"
                : "CADA VIAGEM DEIXA UMA HISTÓRIA"}
          </span>
          <h1>
            {context.phase === "before" ? (
              <>
                Sua próxima
                <br />
                aventura, {user.name}.
              </>
            ) : during ? (
              <>
                {context.localHour < 12
                  ? "Bom dia"
                  : context.localHour < 18
                    ? "Boa tarde"
                    : "Boa noite"}
                ,<br />
                {user.name}.
              </>
            ) : (
              <>
                De volta.
                <br />
                Cheio de histórias.
              </>
            )}
          </h1>
          <p>
            {context.phase === "before"
              ? `${trip.name} está logo ali. Vamos preparar cada detalhe.`
              : during
                ? `Um dia incrível pela frente em ${context.destination?.city ?? "seu destino"}.`
                : "Os momentos passam. As memórias ficam."}
          </p>
        </div>
        {during && (
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("Busca", query);
            }}
          >
            <Search size={21} />
            <input
              aria-label="Buscar informações da viagem"
              placeholder="Buscar lugares, reservas, informações…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
            />
            <button aria-label="Buscar">
              <ArrowRight size={19} />
            </button>
          </form>
        )}
      </section>
      <div className="today-content">
        {data.source === "mock" && (
          <span className="data-note">
            Clima e sugestões demonstrativos · seus registros atualizam esta
            tela
          </span>
        )}
        {context.phase === "before" ? (
          <>
            <Card>
              <div className="section-heading">
                <span className="eyebrow">O MUNDO ESPERA POR VOCÊ</span>
                <CalendarDays className="blue" />
              </div>
              <h2 className="countdown">
                Faltam {context.daysUntil} dias<span>para {trip.name}</span>
              </h2>
              <div className="destination-chip">
                <MapPin size={18} />
                {trip.destinations.map((d) => d.city).join(" · ")}
              </div>
            </Card>
            <Card>
              <div className="section-heading">
                <h3>Preparação da viagem</h3>
                <strong>{data.preparation}%</strong>
              </div>
              <progress
                aria-label="Preparação da viagem"
                value={data.preparation}
                max="100"
              />
              <p className="subtle">
                {data.source === "mock"
                  ? "Progresso dos seus preparativos no checklist."
                  : "Seu checklist acompanha cada preparativo."}
              </p>
              <ul className="pending-list">
                {data.pending.map((item) => (
                  <li key={item}>
                    <span className="pending-dot" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" onClick={() => navigate("Checklist")}>
                Ver pendências
                <ChevronRight size={17} />
              </Button>
            </Card>
            <div className="section-heading">
              <h2>Para começar bem</h2>
            </div>
            <div className="quick-grid">
              {["Bagagem", "Wishlist", "Orçamento"].map((label, i) => {
                const Icon = [CheckCircle2, Bookmark, Wallet][i];
                return (
                  <button
                    key={label}
                    className="card quick-card"
                    onClick={() =>
                      navigate((["Bagagem", "Compras", "Gastos"] as const)[i])
                    }
                  >
                    <Icon className="blue" />
                    <strong>{label}</strong>
                    <span>
                      Preparar minha viagem <ChevronRight size={14} />
                    </span>
                  </button>
                );
              })}
            </div>
            <Button variant="secondary" onClick={() => navigate("Roteiro")}>
              <CalendarDays size={18} />
              Ver roteiro
            </Button>
          </>
        ) : during ? (
          <>
            {data.current ? (
              <Card className="activity-card">
                <div className="section-heading">
                  <span className="tag">AGORA</span>
                  <span className="subtle">Sua próxima experiência</span>
                </div>
                <div className="activity-main">
                  <img
                    className="activity-image"
                    src={data.current.image}
                    alt={data.current.title}
                  />
                  <div>
                    <h2>{data.current.title}</h2>
                    <p className="activity-time">
                      {data.current.time} · {data.current.duration}
                    </p>
                    <p className="location">
                      <MapPin size={14} />
                      {data.current.location}
                    </p>
                  </div>
                </div>
                <div className="metrics">
                  <span>
                    <Car />
                    <span>
                      {data.travel?.minutes ?? "—"} min
                      <small>
                        {data.travel?.kilometers.toLocaleString("pt-BR") ?? "—"}{" "}
                        km · estimado até a próxima parada
                      </small>
                    </span>
                  </span>
                  <span>
                    <Sun className="sun" />
                    <span>
                      {data.travel?.temperature ?? "—"}°
                      <small>Clima demonstrativo</small>
                    </span>
                  </span>
                  <span>
                    <Camera />
                    <span>
                      {data.travel?.photoLabel ?? "—"}
                      <small>Para fotos</small>
                    </span>
                  </span>
                </div>
                {data.current.coordinates.some(Boolean) ? (
                  <MapsLink coordinates={data.current.coordinates}>
                    Ir com Google Maps
                  </MapsLink>
                ) : (
                  <Button onClick={() => navigate("Roteiro")}>
                    Ver atividade no roteiro
                  </Button>
                )}
              </Card>
            ) : (
              <Card>
                <h2>Seu dia começa aqui</h2>
                <p>
                  Nenhuma atividade restante para este horário. Adicione uma
                  experiência ao roteiro ou aproveite o tempo livre.
                </p>
                <Button variant="secondary" onClick={() => navigate("Roteiro")}>
                  Ver roteiro
                </Button>
              </Card>
            )}
            {data.next && (
              <Card>
                <span className="tag muted">A SEGUIR</span>
                <div className="next-item">
                  <img src={data.next.image} alt={data.next.title} />
                  <div>
                    <h3>{data.next.title}</h3>
                    <p className="blue">{data.next.time}</p>
                    <p className="location">
                      <MapPin size={13} />
                      {data.next.location}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("Agente")}
                  >
                    <Sparkles size={16} />
                    Encontrar no caminho
                  </Button>
                </div>
              </Card>
            )}
            {data.suggestion && (
              <Card className="suggestion">
                <div className="section-heading">
                  <span className="tag suggestion-tag">
                    <Sparkles size={13} /> SUGESTÃO PARA VOCÊ
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${data.suggestion.coordinates.join(",")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver mapa
                    <ChevronRight size={14} />
                  </a>
                </div>
                <div className="suggestion-body">
                  <img
                    src={data.suggestion.image}
                    alt="Referência fotográfica de viagem"
                  />
                  <div>
                    <h3>{data.suggestion.title}</h3>
                    <p>
                      <span className="sun">★ {data.suggestion.rating}</span>
                      <span className="subtle"> · avaliação simulada</span>
                    </p>
                    <div className="suggestion-details">
                      <span>
                        <Car size={16} />
                        {data.suggestion.detour} de desvio
                      </span>
                      <span>
                        <Sun size={16} />
                        {data.suggestion.light}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => navigate("Explorar")}
                    >
                      <Sparkles size={17} />
                      Vale o desvio
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            <div className="section-heading">
              <h2>Mais para hoje</h2>
              <button className="text-button" onClick={() => navigate("Mais")}>
                Ver todos
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="daily-grid">
              <Card>
                <span>Clima do dia</span>
                <h3>
                  <Sun className="sun" />
                  {data.weather ? `${data.weather.temperature}°` : "—"}
                </h3>
                <small>
                  {data.weather
                    ? `Máx ${data.weather.max}° · Mín ${data.weather.min}°`
                    : "Ainda não conectado"}
                </small>
              </Card>
              <Card>
                <span>Gastos do dia</span>
                <h3>
                  <Wallet className="green" />
                  {data.spending !== null ? `US$ ${data.spending}` : "—"}
                </h3>
                <small>
                  {data.budget !== null
                    ? `de ~US$ ${data.budget}`
                    : "Ainda não conectado"}
                </small>
              </Card>
              <Card>
                <span>Próximo horário fixo</span>
                <h3>
                  <Clock className="blue" />
                  {data.fixedTime ?? "—"}
                </h3>
                <small>{data.fixedTitle ?? "Nenhum compromisso"}</small>
              </Card>
            </div>
          </>
        ) : (
          <>
            <Card>
              <span className="eyebrow">{trip.name} · RETROSPECTIVA</span>
              <h2>{context.totalDays} dias para lembrar.</h2>
              <p>
                {trip.destinations.length} cidade ·{" "}
                {data.summary
                  ? `${data.summary.places} lugares visitados`
                  : "Lugares ainda não registrados"}
              </p>
              <div className="summary-grid">
                <span>
                  <Camera className="blue" />
                  <strong>{data.summary?.photos ?? "—"}</strong>Fotos
                </span>
                <span>
                  <MapPin className="blue" />
                  <strong>{data.summary?.places ?? "—"}</strong>Lugares
                </span>
                <span>
                  <Bookmark className="blue" />
                  <strong>{data.summary?.favorites ?? "—"}</strong>Favoritos
                </span>
              </div>
            </Card>
            <Card>
              <div className="section-heading">
                <h3>Seus melhores momentos</h3>
                <Image className="blue" />
              </div>
              <img
                className="memory-cover"
                src={trip.cover}
                alt="Paisagem da viagem"
              />
              <p>
                Fotos, diário, photo spots e favoritos reunidos nas Memórias.
              </p>
              <Button variant="secondary" onClick={() => navigate("Memórias")}>
                Ver Memórias
                <ChevronRight size={17} />
              </Button>
            </Card>
            <div className="quick-grid">
              <button
                className="card quick-card"
                onClick={() => navigate("Gastos")}
              >
                <Wallet className="green" />
                <strong>Gastos da viagem</strong>
                <span>Ver resumo e saldo entre viajantes</span>
              </button>
              <button
                className="card quick-card"
                onClick={() => navigate("Memórias")}
              >
                <Bookmark className="blue" />
                <strong>Compras e favoritos</strong>
                <span>Revisite suas descobertas</span>
              </button>
            </div>
          </>
        )}
      </div>
      <footer className="photo-credit">
        Foto:{" "}
        <a
          href="https://commons.wikimedia.org/wiki/File:Griffith_Observatory,_Los_Angeles.jpg"
          target="_blank"
          rel="noopener noreferrer"
        >
          TobyJohn2506
        </a>{" "}
        ·{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY-SA 4.0
        </a>
      </footer>
    </main>
  );
}
