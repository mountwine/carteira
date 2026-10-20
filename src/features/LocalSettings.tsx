import { useEffect, useState } from "react";
import { useTravel } from "../data/TravelContext";
import { Page, Modal } from "../components/forms";
import type { User } from "../domain/models";
import { all, put } from "../data/database";
import { localAuth, accountConfigured, updateAccount } from "../adapters/local";
import { persistTrip } from "../adapters/local";
export type NavigationApp = "ask" | "apple" | "google" | "waze";
export const navigationPreference = () =>
  (localStorage.getItem("travel-os:navigation") as NavigationApp) || "ask";
export function navigationUrl(
  address: string,
  lat?: number | null,
  lng?: number | null,
  app: NavigationApp = "google",
) {
  const point = lat != null && lng != null ? `${lat},${lng}` : address;
  return app === "apple"
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(point)}`
    : app === "waze"
      ? `https://waze.com/ul?${lat != null && lng != null ? "ll" : "q"}=${encodeURIComponent(point)}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`;
}
export function NavigateButton({
  address,
  lat,
  lng,
}: {
  address: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const [open, setOpen] = useState(false),
    [always, setAlways] = useState(false);
  const apple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  function go(app: NavigationApp) {
    if (always) localStorage.setItem("travel-os:navigation", app);
    window.open(
      navigationUrl(address, lat, lng, app),
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }
  return (
    <>
      <button
        className="button primary"
        disabled={!address && lat == null}
        onClick={() =>
          navigationPreference() === "ask"
            ? setOpen(true)
            : go(navigationPreference())
        }
      >
        🧭 Navegar
      </button>
      {open && (
        <Modal
          placement="bottom"
          title="Navegar com"
          onClose={() => setOpen(false)}
        >
          {(apple ? ["apple", "google", "waze"] : ["google", "waze"]).map(
            (app) => (
              <button
                className="menu-row"
                key={app}
                onClick={() => go(app as NavigationApp)}
              >
                {app === "apple"
                  ? "Apple Maps"
                  : app === "google"
                    ? "Google Maps"
                    : "Waze"}
              </button>
            ),
          )}
          <label className="check-label">
            <input
              type="checkbox"
              checked={always}
              onChange={(e) => setAlways(e.target.checked)}
            />
            Usar sempre minha preferência
          </label>
        </Modal>
      )}
    </>
  );
}

export function SettingsContent() {
  const [preference, setPreference] = useState(navigationPreference());
  return (
    <>
      <section className="card">
        <h2>Navegação</h2>
        <label>
          Aplicativo padrão
          <select
            value={preference}
            onChange={(e) => {
              const v = e.target.value as NavigationApp;
              setPreference(v);
              localStorage.setItem("travel-os:navigation", v);
            }}
          >
            {[
              ["ask", "Perguntar sempre"],
              ["apple", "Apple Maps"],
              ["google", "Google Maps"],
              ["waze", "Waze"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </section>
      <p>
        Dados e anexos armazenados neste dispositivo. Limpar os dados do
        navegador também remove os dados do Foravento.
      </p>
    </>
  );
}
export function LocalSettings() {
  return (
    <Page title="Configurações">
      <SettingsContent />
    </Page>
  );
}
export function AccountContent({ user }: { user: User }) {
  const [name, setName] = useState(user.name),
    [email, setEmail] = useState(user.email),
    [password, setPassword] = useState(""),
    [configured, setConfigured] = useState<boolean | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void accountConfigured(user).then(setConfigured);
  }, [user.id]);
  return (
    <form
      className="record-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (!configured) await localAuth.signup(name, email, password);
          else
            await updateAccount({
              ...user,
              name: name.trim(),
              email: email.trim().toLowerCase(),
            });
          setConfigured(true);
          setError("Conta salva neste dispositivo.");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Nome
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {configured === false && (
        <>
          <p>
            Defina o acesso local para entrar novamente mantendo suas viagens.
          </p>
          <label>
            Senha
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </>
      )}
      <p>Sessão local neste dispositivo. Não há conta online.</p>
      {error && <p role="status">{error}</p>}
      <button className="button primary" disabled={busy || configured === null}>
        Salvar conta
      </button>
    </form>
  );
}
export function LocalAccount() {
  const t = useTravel();
  return (
    <Page title="Conta">
      <AccountContent user={t.user} />
    </Page>
  );
}
interface Friend {
  id: string;
  ownerId: string;
  name: string;
}
export function FriendsContent({ user }: { user: User }) {
  const [items, setItems] = useState<Friend[]>([]),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  async function load() {
    setItems(
      (await all<Friend>("settings")).filter(
        (r) => r.id.startsWith("friend:") && r.ownerId === user.id,
      ),
    );
  }
  useEffect(() => {
    void load();
  }, [user.id]);
  return (
    <>
      <p>
        Contatos locais. Adicionar um amigo não envia convites nem compartilha
        viagens.
      </p>
      {items.map((f) => (
        <section className="card" key={f.id}>
          {f.name}
        </section>
      ))}
      <form
        className="record-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await put("settings", {
              id: `friend:${crypto.randomUUID()}`,
              ownerId: user.id,
              name: name.trim(),
            });
            setName("");
            await load();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          Nome
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={!name.trim()}>
          + Adicionar amigo
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </>
  );
}
export function LocalFriends() {
  const t = useTravel();
  return (
    <Page title="Amigos">
      <FriendsContent user={t.user} />
    </Page>
  );
}
export function LocalTravelers({ refresh }: { refresh: () => Promise<void> }) {
  const t = useTravel(),
    [name, setName] = useState(""),
    [adding, setAdding] = useState(false);
  return (
    <Page title="Viajantes" back="Mais">
      <ul className="local-travelers">
        {t.trip.members.map((m) => (
          <li className="card" key={m.userId}>
            <strong>{m.displayName}</strong>
            <small>Registro local</small>
          </li>
        ))}
      </ul>
      <button className="button primary" onClick={() => setAdding(true)}>
        + Adicionar viajante
      </button>
      {adding && (
        <Modal title="Adicionar viajante" onClose={() => setAdding(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                persistTrip({
                  ...t.trip,
                  members: [
                    ...t.trip.members,
                    {
                      userId: crypto.randomUUID(),
                      displayName: name.trim(),
                      invitationState: "accepted",
                      preferences: {},
                    },
                  ],
                });
                await refresh();
                setAdding(false);
                setName("");
              } catch (err) {
                t.notify((err as Error).message);
              }
            }}
          >
            <label>
              Nome
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={!name.trim()}>
              Adicionar
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
