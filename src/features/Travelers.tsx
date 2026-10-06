import { useState, useEffect } from "react";
import { Users, Copy, Share2, Plus, Trash2 } from "lucide-react";
import { useTravel } from "../data/TravelContext";
import { Page, Modal, RecordEditor } from "../components/forms";
import { Card, Button } from "../components/ui";
import { createInvite, updateTrip } from "../adapters/tripManagement";
import { isDemo } from "../adapters";
import { message } from "../data/engine";
import { loadPreferences } from "../adapters/preferences";
import type { Profile as ProfileData } from "../domain/entities";
import { ofKind } from "../domain/entities";
export function Travelers({ refresh }: { refresh: () => Promise<void> }) {
  const t = useTravel();
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(t.trip),
    [error, setError] = useState("");
  return (
    <Page
      title="Viajantes"
      subtitle="Uma viagem compartilhada, com espaço para cada pessoa."
      back="Mais"
    >
      {t.trip.members.map((m) => (
        <Card key={m.userId}>
          <div className="section-heading">
            <h2>{m.displayName}</h2>
            <span>
              {m.invitationState === "accepted"
                ? "Participante"
                : "Convite pendente"}
            </span>
          </div>
          <p>Todos podem editar o conteúdo compartilhado.</p>
        </Card>
      ))}
      <Button
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void createInvite(t.trip, t.user)
            .then(setCode)
            .catch((e) => t.notify(message(e)))
            .finally(() => setBusy(false));
        }}
      >
        <Plus size={17} />
        Gerar convite
      </Button>
      {code && (
        <Card>
          <h3>Convite válido por 7 dias</h3>
          <p className="invite-code">{code}</p>
          <small>
            Uso único.{" "}
            {isDemo
              ? "No modo demo, só funciona neste navegador; troque para Maya para validar."
              : "O convidado precisa entrar na própria conta."}
          </small>
          <div className="action-row">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(`${location.origin}/#invite=${code}`)
                  .then(() => t.notify("Link copiado"))
                  .catch(() => t.notify("Copie o código exibido acima."));
              }}
            >
              <Copy size={16} />
              Copiar link
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void navigator.clipboard
                  .writeText(code)
                  .then(() => t.notify("Código copiado"));
              }}
            >
              Copiar código
            </Button>
          </div>
        </Card>
      )}
      <Card>
        <h2>Sua viagem</h2>
        <p>
          {t.trip.name} · {t.trip.startDate} a {t.trip.endDate}
        </p>
        {t.trip.destinations.map((d) => (
          <p key={d.id}>
            {d.city} · {d.startDate} → {d.endDate}
            <small> · {d.timezone}</small>
          </p>
        ))}
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(structuredClone(t.trip));
            setEditing(true);
          }}
        >
          Editar viagem e destinos
        </Button>
      </Card>
      {editing && (
        <Modal title="Viagem e destinos" onClose={() => setEditing(false)}>
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              void (async () => {
                try {
                  const acts = ofKind(t.records, "activity");
                  if (
                    acts.some(
                      (a) =>
                        a.data.date < draft.startDate ||
                        a.data.date > draft.endDate,
                    )
                  )
                    throw new Error(
                      "Mova ou remova as atividades fora do novo período antes de alterar as datas.",
                    );
                  await updateTrip(draft, t.user);
                  await refresh();
                  setEditing(false);
                  t.notify("Viagem atualizada");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            <label>
              Nome
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Capa (URL ou imagem local)
              <input
                value={draft.cover}
                onChange={(e) => setDraft({ ...draft, cover: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Início
                <input
                  type="date"
                  required
                  value={draft.startDate}
                  onChange={(e) =>
                    setDraft({ ...draft, startDate: e.target.value })
                  }
                />
              </label>
              <label>
                Fim
                <input
                  type="date"
                  required
                  value={draft.endDate}
                  onChange={(e) =>
                    setDraft({ ...draft, endDate: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Ritmo
              <select
                value={draft.pace}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    pace: e.target.value as typeof draft.pace,
                  })
                }
              >
                <option value="relaxed">Relaxado</option>
                <option value="balanced">Equilibrado</option>
                <option value="intense">Intenso</option>
              </select>
            </label>
            {draft.destinations.map((d, i) => (
              <fieldset key={d.id}>
                <legend>Destino {i + 1}</legend>
                {(
                  [
                    "city",
                    "country",
                    "startDate",
                    "endDate",
                    "timezone",
                  ] as const
                ).map((key, j) => (
                  <label key={key}>
                    {["Cidade", "País", "Início", "Fim", "Fuso IANA"][j]}
                    <input
                      type={key.endsWith("Date") ? "date" : "text"}
                      required
                      value={d[key]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          destinations: draft.destinations.map((x) =>
                            x.id === d.id ? { ...x, [key]: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <Button
                  variant="ghost"
                  disabled={draft.destinations.length === 1}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      destinations: draft.destinations.filter(
                        (x) => x.id !== d.id,
                      ),
                    })
                  }
                >
                  <Trash2 size={15} />
                  Remover destino
                </Button>
              </fieldset>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  destinations: [
                    ...draft.destinations,
                    {
                      id: crypto.randomUUID(),
                      city: "",
                      country: "",
                      startDate: draft.startDate,
                      endDate: draft.endDate,
                      timezone: "America/Sao_Paulo",
                      transport: [],
                    },
                  ],
                })
              }
            >
              Adicionar destino
            </Button>
            {error && <p role="alert">{error}</p>}
            <Button type="submit" disabled={busy}>
              Salvar viagem
            </Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
export function Profile() {
  const t = useTravel();
  const [permanent, setPermanent] = useState<Partial<ProfileData>>({});
  useEffect(() => {
    void loadPreferences(t.user.id)
      .then(setPermanent)
      .catch((e) => t.notify(message(e)));
  }, [t.user.id]);
  const profile = ofKind(t.records, "profile").find(
    (p) => p.ownerId === t.user.id,
  );
  const display = {
    ...profile?.data,
    ...permanent,
    tripPreferences: profile?.data.tripPreferences,
  };
  const [editing, setEditing] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  return (
    <Page
      title="Perfil"
      subtitle="Preferências que acompanham você."
      back="Mais"
    >
      <Card>
        <div className="avatar">{t.user.name[0]}</div>
        <h2>{display.title ?? t.user.name}</h2>
        <p>{t.user.email}</p>
        <p>{display.interests?.join(" · ") || "Fotografia · Gastronomia"}</p>
        <p>
          Moeda: {display.currency ?? "BRL"} · Idioma:{" "}
          {display.language ?? "pt-BR"}
        </p>
        <p>{display.preferences}</p>
        <p>{profile?.data.tripPreferences}</p>
        <Button onClick={() => setEditing(true)}>
          Editar perfil e preferências
        </Button>
      </Card>
      <Card>
        <h2>Notificações</h2>
        <p>
          Alertas enquanto o app estiver aberto. Entrega em segundo plano
          depende de push e não está habilitada.
        </p>
        {profile ? (
          (["critical", "useful", "opportunities"] as const).map((key, i) => (
            <label className="check-label" key={key}>
              <input
                type="checkbox"
                checked={profile.data.notifications[key]}
                onChange={(e) => {
                  void t
                    .save({
                      ...profile,
                      data: {
                        ...profile.data,
                        notifications: {
                          ...profile.data.notifications,
                          [key]: e.target.checked,
                        },
                      },
                    })
                    .catch((e) => t.notify(message(e)));
                }}
              />
              {
                [
                  "Críticas · horários e reservas",
                  "Úteis · clima e preparação",
                  "Oportunidades · fotos e sugestões",
                ][i]
              }
            </label>
          ))
        ) : (
          <p>Salve seu perfil para escolher as categorias.</p>
        )}
        <Button
          variant="secondary"
          disabled={permission === "granted"}
          onClick={() => {
            if (typeof Notification === "undefined") {
              t.notify("Notificações não são suportadas neste navegador.");
              return;
            }
            void Notification.requestPermission().then((p) => {
              setPermission(p);
              t.notify(
                p === "granted"
                  ? "Notificações permitidas"
                  : "Permissão não concedida. Você continua vendo os alertas no app.",
              );
            });
          }}
        >
          {permission === "granted"
            ? "Notificações permitidas"
            : "Permitir notificações no dispositivo"}
        </Button>
      </Card>
      {editing && (
        <RecordEditor
          kind="profile"
          record={profile}
          initial={{
            ...permanent,
            tripPreferences: profile?.data.tripPreferences ?? "",
          }}
          onClose={() => {
            setEditing(false);
            void loadPreferences(t.user.id).then(setPermanent);
          }}
        />
      )}
    </Page>
  );
}
