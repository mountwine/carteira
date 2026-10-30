import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, WifiOff } from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { services, startCloudSync } from "../adapters";
import type { SyncStatus } from "../data/cloudSync";
import { homeContext, type Trip, type User } from "../domain/models";
import { Auth } from "../features/Auth";
import { JoinTrip } from "../features/JoinTrip";
import { Trips } from "../features/Trips";
import { TripEditor } from "../features/TripEditor";
import { TravelProvider, type Screen } from "../data/TravelContext";
import { Nav } from "../components/ui";
import { Modal } from "../components/forms";
import { Workspace } from "./Workspace";
import {
  pushNavigation,
  backNavigation,
  screenLabel,
  type NavigationEntry,
} from "../domain/navigation";
import {
  AccountContent,
  FriendsContent,
  SettingsContent,
} from "../features/LocalSettings";
import { importPhoto } from "../data/media";
const rootEntry = (screen = "Hoje"): NavigationEntry => ({
  id: crypto.randomUUID(),
  screen,
  focus: "",
  scroll: 0,
});
export function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [trips, setTrips] = useState<Trip[]>([]),
    [trip, setTrip] = useState<Trip | null>(null),
    [entries, setEntries] = useState<NavigationEntry[]>([rootEntry()]),
    [menu, setMenu] = useState<
      | "trips"
      | "avatar"
      | "add"
      | "new"
      | "join"
      | "logout"
      | "Conta"
      | "Amigos"
      | "Configurações"
      | null
    >(null),
    [editor, setEditor] = useState<Trip | null | undefined>(),
    [error, setError] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [update, setUpdate] = useState<(() => void) | null>(null),
    [now, setNow] = useState(new Date()),
    [recovery, setRecovery] = useState(""),
    [sync, setSync] = useState<SyncStatus>({ state: "idle" });
  const photosInput = useRef<HTMLInputElement>(null);
  const route = entries[entries.length - 1];
  const backLabel =
    entries.length > 1 ? screenLabel(entries[entries.length - 2].screen) : "";
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    const off = services.auth.subscribe(setUser);
    void services.auth
      .current()
      .then(setUser)
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
    const timer = setInterval(() => setNow(new Date()), 60000);
    const handler = () => setOnline(navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    const refreshSW = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => void refreshSW(true));
      },
    });
    return () => {
      off();
      clearInterval(timer);
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, []);
  useEffect(() => {
    setTrip(null);
    setTrips([]);
    if (user) {
      void services.trips
        .list(user.id)
        .then(setTrips)
        .catch((e) => setError(e.message));
    }
  }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    const code = sessionStorage.getItem("travel-os:recovery");
    if (code) {
      setRecovery(code);
      sessionStorage.removeItem("travel-os:recovery");
    }
  }, [user]);
  function navigate(screen: Screen, focus = "") {
    setEntries((prev) =>
      pushNavigation(
        prev,
        screen,
        focus === "new" ? `new:${crypto.randomUUID()}` : focus,
        window.scrollY,
      ),
    );
    history.pushState({ travelOS: true }, "");
    window.scrollTo(0, 0);
  }
  function back() {
    if (entries.length > 1) history.back();
  }
  useEffect(() => {
    const pop = () => setEntries((prev) => backNavigation(prev));
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    requestAnimationFrame(() => window.scrollTo(0, route.scroll));
  }, [route.id]);
  const syncNow = useRef<(() => Promise<void> | void) | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!user) return;
    const service = startCloudSync(
      user,
      () => void refreshRef.current(),
      setSync,
    );
    syncNow.current = service ? service.run : null;
    return () => {
      service?.stop();
      syncNow.current = null;
      setSync({ state: "idle" });
    };
  }, [user?.id]);
  async function refresh(id?: string) {
    if (!user) return;
    const list = await services.trips.list(user.id);
    setTrips(list);
    if (trip) {
      setTrip(list.find((t) => t.id === (id ?? trip.id)) ?? null);
      if (id && id !== trip.id) {
        setEntries([rootEntry()]);
        history.replaceState({ travelOS: true }, "");
      }
    } else if (id) {
      setTrip(list.find((t) => t.id === id) ?? null);
      setEntries([rootEntry()]);
    }
  }
  refreshRef.current = () => refresh();
  function selectTrip(t: Trip) {
    setTrip(t);
    setMenu(null);
    setEntries([
      rootEntry(
        trip &&
          [
            "Hoje",
            "Roteiro",
            "Álbum",
            "Mais",
            "Bagagem",
            "Reservas",
            "Documentos",
            "Gastos",
            "Compras",
            "Conversor",
            "Viajantes",
            "SOS",
          ].includes(route.screen)
          ? route.screen
          : "Hoje",
      ),
    ]);
    history.replaceState({ travelOS: true }, "");
    window.scrollTo(0, 0);
  }
  function tab(screen: Screen) {
    setEntries([rootEntry(screen)]);
    history.replaceState({ travelOS: true }, "");
    window.scrollTo(0, 0);
  }
  if (!ready)
    return (
      <div className="center-state" role="status">
        Abrindo Foravento…
      </div>
    );
  return (
    <div className="app-shell">
      {!online && (
        <div className="offline-banner">
          <WifiOff size={16} />
          Offline · dados salvos neste dispositivo
        </div>
      )}
      {update && (
        <div className="offline-banner">
          Uma atualização está pronta.
          <button onClick={update}>Atualizar</button>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button aria-label="Fechar aviso" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {!user ? (
        <Auth />
      ) : (
        <>
          <header className="app-header">
            <div className="header-main">
              <div className="header-brand" aria-label="Foravento">
                <img src="/foravento-mark.png" alt="" width="36" height="36" />
                <span>Foravento</span>
              </div>
              <button
                className="avatar"
                aria-label="Abrir menu da conta"
                onClick={() => setMenu("avatar")}
              >
                {user.name.charAt(0)}
              </button>
            </div>
            {trip && (
              <div className="header-context">
                <button
                  className="header-trip"
                  onClick={() => setMenu("trips")}
                >
                  <span>{trip.name}</span>
                  <ChevronDown size={16} />
                </button>
                <button
                  className="header-search"
                  aria-label="Busca"
                  onClick={() => navigate("Busca")}
                >
                  <Search size={20} />
                </button>
              </div>
            )}
          </header>
          {!trip ? (
            <>
              <Trips
                actions={
                  <div className="trip-list-actions">
                    <button
                      className="button primary"
                      onClick={() => setMenu("new")}
                    >
                      + Nova viagem
                    </button>
                  </div>
                }
                user={user}
                trips={trips}
                open={selectTrip}
                edit={setEditor}
              />
            </>
          ) : (
            <TravelProvider
              key={`${trip.id}:${user.id}`}
              user={user}
              trip={trip}
              date={homeContext(trip, now).date}
              focus={route.focus}
              navigate={navigate}
              back={back}
              backLabel={backLabel}
              activeScreen={route.screen as Screen}
            >
              <Workspace
                screen={route.screen as Screen}
                refresh={() => refresh()}
              />
              <Nav
                active={
                  ["Hoje", "Roteiro", "Álbum", "Mais"].includes(route.screen)
                    ? route.screen
                    : "Mais"
                }
                onChange={tab}
                onAdd={() => setMenu("add")}
              />
            </TravelProvider>
          )}
          {menu === "trips" && (
            <Modal title="Trocar viagem" onClose={() => setMenu(null)}>
              {trips.map((t) => (
                <button
                  className="trip-select-row"
                  key={t.id}
                  onClick={() => selectTrip(t)}
                >
                  <strong>
                    {trip?.id === t.id ? "✓ " : ""}
                    {t.name}
                  </strong>
                  <small>
                    {t.startDate} — {t.endDate}
                  </small>
                </button>
              ))}
              <button className="text-button" onClick={() => setMenu("new")}>
                + Criar nova viagem
              </button>
            </Modal>
          )}
          {menu === "avatar" && (
            <Modal
              placement="bottom"
              title={user.name}
              onClose={() => setMenu(null)}
            >
              {[
                "Conta",
                "Minhas viagens",
                "Amigos",
                "Configurações",
                "Sair",
              ].map((label) => (
                <button
                  className="menu-row"
                  key={label}
                  onClick={() => {
                    setMenu(null);
                    if (label === "Sair") setMenu("logout");
                    else if (label === "Minhas viagens") setTrip(null);
                    else if (trip) navigate(label as Screen);
                    else setMenu(label as "Conta" | "Amigos" | "Configurações");
                  }}
                >
                  {label}
                </button>
              ))}
            </Modal>
          )}
          {(menu === "Conta" ||
            menu === "Amigos" ||
            menu === "Configurações") && (
            <Modal title={menu} onClose={() => setMenu(null)}>
              {menu === "Conta" ? (
                <AccountContent
                  user={user}
                  sync={sync}
                  onSyncNow={() => void syncNow.current?.()}
                />
              ) : menu === "Amigos" ? (
                <FriendsContent user={user} />
              ) : (
                <SettingsContent />
              )}
            </Modal>
          )}
          {menu === "logout" && (
            <Modal title="Sair da sessão?" onClose={() => setMenu(null)}>
              <p>Seus dados serão preservados neste dispositivo.</p>
              <button
                className="button secondary"
                onClick={() => setMenu(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                onClick={() => {
                  void services.auth.logout();
                  setMenu(null);
                }}
              >
                Sair
              </button>
            </Modal>
          )}
          {menu === "new" && (
            <Modal title="Nova viagem" onClose={() => setMenu(null)}>
              <button
                className="pick-row"
                onClick={() => {
                  setMenu(null);
                  setEditor(null);
                }}
              >
                <strong>Minha viagem</strong>
                <small>Crie uma viagem do zero.</small>
              </button>
              <button className="pick-row" onClick={() => setMenu("join")}>
                <strong>Código de viagem</strong>
                <small>Entre numa viagem que alguém já criou.</small>
              </button>
            </Modal>
          )}
          {menu === "join" && (
            <JoinTrip
              user={user}
              onClose={() => setMenu(null)}
              onJoined={async (id) => {
                await syncNow.current?.();
                const list = await services.trips.list(user.id);
                setTrips(list);
                setMenu(null);
                const found = list.find((t) => t.id === id);
                if (found) await selectTrip(found);
                else
                  setError(
                    "Você entrou na viagem, mas ela ainda não carregou. Abra Conta e toque em Sincronizar agora.",
                  );
              }}
            />
          )}
          {menu === "add" && (
            <Modal
              placement="bottom"
              title="Adicionar"
              onClose={() => setMenu(null)}
            >
              {(
                [
                  "Adicionar atividade",
                  "Adicionar compra",
                  "Adicionar gasto",
                  "Adicionar foto",
                ] as const
              ).map((label, i) => (
                <button
                  className="menu-row"
                  key={label}
                  onClick={() => {
                    setMenu(null);
                    if (i === 3) photosInput.current?.click();
                    else
                      navigate(
                        (["Roteiro", "Compras", "Gastos"] as const)[i],
                        "new",
                      );
                  }}
                >
                  {label}
                </button>
              ))}
              <button className="text-button" onClick={() => setMenu(null)}>
                Cancelar
              </button>
            </Modal>
          )}
          <input
            ref={photosInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              if (!trip) return;
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              for (const file of files) {
                try {
                  await importPhoto(
                    file,
                    trip.id,
                    user.id,
                    "album",
                    homeContext(trip, new Date()).date,
                  );
                } catch (err) {
                  setError((err as Error).message);
                }
              }
              navigate("Álbum");
            }}
          />
          {editor !== undefined && (
            <TripEditor
              trip={editor ?? undefined}
              user={user}
              onSaved={refresh}
              onClose={() => setEditor(undefined)}
            />
          )}
          {recovery && (
            <Modal
              title="Guarde sua chave de recuperação"
              onClose={() => setRecovery("")}
            >
              <p>
                Esta chave recupera a senha somente neste dispositivo. Não há
                envio de email.
              </p>
              <code className="recovery-key">{recovery}</code>
              <button
                className="button primary"
                onClick={() => setRecovery("")}
              >
                Guardei a chave
              </button>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
