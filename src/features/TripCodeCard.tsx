import { useEffect, useState } from "react";
import { tripCodes } from "../adapters";
import { persistTrip } from "../adapters/local";
import type { TripCodeInfo } from "../adapters/tripCodeApi";
import { useTravel } from "../data/TravelContext";
import { formatTripCode } from "../domain/tripCode";

/** Shows the trip's code to its travelers, and lets the owner renew it or a guest leave. */
export function TripCodeCard({ refresh }: { refresh: () => Promise<void> }) {
  const t = useTravel(),
    [info, setInfo] = useState<TripCodeInfo | null | undefined>(),
    [ask, setAsk] = useState<"rotate" | "leave" | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!tripCodes) return;
    let live = true;
    setInfo(undefined);
    tripCodes
      .info(t.trip.id, t.user.id)
      .then((value) => live && setInfo(value))
      .catch((e: Error) => {
        if (!live) return;
        setInfo(null);
        setMessage(e.message);
      });
    return () => {
      live = false;
    };
  }, [t.trip.id, t.user.id]);
  if (!tripCodes) return null;
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
      setAsk(null);
    }
  }
  return (
    <section className="card trip-code-card" aria-label="Código da viagem">
      <span className="eyebrow">CÓDIGO DA VIAGEM</span>
      {info === undefined ? (
        <p role="status">Carregando…</p>
      ) : info === null ? (
        <p role="status">
          {message ||
            "Esta viagem ainda não está na sua conta. Aguarde a sincronização e abra de novo."}
        </p>
      ) : (
        <>
          <strong className="trip-code" aria-label={`Código ${info.code}`}>
            {formatTripCode(info.code)}
          </strong>
          <p>
            Quem tiver este código entra na viagem informando só o nome e vê
            tudo o que é compartilhado. Passe só para quem você confia.
          </p>
          <div className="action-row">
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(info.code)
                  .then(() => setMessage("Código copiado."))
                  .catch(() => setMessage("Não foi possível copiar."))
              }
            >
              Copiar código
            </button>
            {info.role === "owner" ? (
              <button
                type="button"
                className="button ghost"
                disabled={busy}
                onClick={() => setAsk("rotate")}
              >
                Gerar novo código
              </button>
            ) : (
              <button
                type="button"
                className="button ghost"
                disabled={busy}
                onClick={() => setAsk("leave")}
              >
                Sair da viagem
              </button>
            )}
          </div>
          {ask === "rotate" && (
            <div role="alertdialog" aria-label="Confirmar novo código">
              <p>
                O código atual deixa de valer. Quem já está na viagem continua
                nela.
              </p>
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const code = await tripCodes!.rotate(t.trip.id);
                    setInfo({ ...info, code });
                    setMessage("Novo código gerado.");
                  })
                }
              >
                Gerar novo código
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setAsk(null)}
              >
                Cancelar
              </button>
            </div>
          )}
          {ask === "leave" && (
            <div role="alertdialog" aria-label="Confirmar saída">
              <p>
                A viagem some da sua lista. Para voltar, será preciso o código
                de novo.
              </p>
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await tripCodes!.leave(t.trip.id);
                    persistTrip({ ...t.trip, deleted: true });
                    await refresh();
                  })
                }
              >
                Sair da viagem
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setAsk(null)}
              >
                Cancelar
              </button>
            </div>
          )}
          {message && <p role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
