import { useState } from "react";
import type { User } from "../domain/models";
import { Button } from "../components/ui";
import { Modal } from "../components/forms";
import { createTrip, acceptInvite } from "../adapters/tripManagement";
import { message } from "../data/engine";
export function TripActions({
  user,
  refresh,
}: {
  user: User;
  refresh: (id?: string) => Promise<void>;
}) {
  const [mode, setMode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <div className="action-row trip-actions">
        <Button onClick={() => setMode("create")}>Criar viagem</Button>
        <Button variant="secondary" onClick={() => setMode("join")}>
          Entrar com convite
        </Button>
      </div>
      {mode && (
        <Modal
          title={mode === "create" ? "Sua próxima viagem" : "Entrar na viagem"}
          onClose={() => setMode("")}
        >
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              void (async () => {
                try {
                  const id =
                    mode === "join"
                      ? await acceptInvite(
                          String(form.get("code")).trim(),
                          user,
                        )
                      : await createTrip(user, {
                          name: String(form.get("name")),
                          city: String(form.get("city")),
                          startDate: String(form.get("start")),
                          endDate: String(form.get("end")),
                          timezone: String(form.get("timezone")),
                        });
                  await refresh(id);
                  setMode("");
                  if (mode === "join")
                    history.replaceState(null, "", location.pathname);
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {mode === "join" ? (
              <label>
                Código de convite
                <input
                  name="code"
                  required
                  defaultValue={
                    new URLSearchParams(location.hash.slice(1)).get("invite") ??
                    ""
                  }
                />
              </label>
            ) : (
              <>
                <label>
                  Nome da viagem
                  <input
                    name="name"
                    required
                    maxLength={100}
                    placeholder="Uma nova aventura"
                  />
                </label>
                <label>
                  Primeiro destino
                  <input name="city" required placeholder="Los Angeles" />
                </label>
                <div className="form-grid">
                  <label>
                    Início
                    <input name="start" type="date" required />
                  </label>
                  <label>
                    Fim
                    <input name="end" type="date" required />
                  </label>
                </div>
                <label>
                  Fuso do destino
                  <select name="timezone" defaultValue="America/Los_Angeles">
                    {[
                      "America/Los_Angeles",
                      "America/New_York",
                      "America/Sao_Paulo",
                      "Europe/Lisbon",
                      "Europe/Paris",
                      "Asia/Tokyo",
                      "UTC",
                    ].map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </label>
                <small>
                  Você poderá adicionar outros destinos e ajustar o fuso em
                  Viajantes.
                </small>
              </>
            )}
            {error && (
              <p role="alert" className="notice">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? "Salvando…"
                : mode === "join"
                  ? "Aceitar convite"
                  : "Criar viagem"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
