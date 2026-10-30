import { useState } from "react";
import { tripCodes } from "../adapters";
import { Modal } from "../components/forms";
import type { User } from "../domain/models";
import {
  codeFormatMessage,
  normalizeTripCode,
  validTripCode,
} from "../domain/tripCode";

/** Enter a trip someone else created: code + your name. */
export function JoinTrip({
  user,
  onClose,
  onJoined,
}: {
  user: User;
  onClose: () => void;
  onJoined: (tripId: string) => Promise<void>;
}) {
  const api = tripCodes,
    [name, setName] = useState(user.name),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Código de viagem" onClose={onClose}>
      {!api ? (
        <p role="status">
          Para entrar numa viagem por código, use o login por e-mail.
        </p>
      ) : (
        <form
          className="record-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!name.trim()) return setError("Informe o seu nome.");
            if (!validTripCode(code)) return setError(codeFormatMessage(code));
            setBusy(true);
            try {
              const tripId = await api.join(code, name.trim());
              await onJoined(tripId);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Não foi possível entrar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Código da viagem
            <input
              className="trip-code-input"
              value={code}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              onChange={(e) => setCode(normalizeTripCode(e.target.value))}
            />
          </label>
          <label>
            Seu nome na viagem
            <input
              value={name}
              maxLength={60}
              autoComplete="name"
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p>
            Peça o código a quem criou a viagem. Você verá o roteiro e tudo o
            que for compartilhado com os viajantes.
          </p>
          {error && <p role="alert">{error}</p>}
          <button className="button primary" disabled={busy}>
            {busy ? "Entrando…" : "Entrar na viagem"}
          </button>
        </form>
      )}
    </Modal>
  );
}
