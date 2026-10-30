import { useEffect, useState } from "react";
import type { EmailCodeAuth } from "../domain/ports";
import { normalizeEmail } from "../adapters/emailAuth";

const RESEND_SECONDS = 60;

export function CodeLogin({ auth }: { auth: EmailCodeAuth }) {
  const [email, setEmail] = useState(""),
    [sentTo, setSentTo] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  async function send(address: string) {
    setBusy(true);
    setError("");
    try {
      await auth.sendCode(address);
      setSentTo(normalizeEmail(address));
      setCode("");
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="local-login">
      <div className="login-cover" aria-hidden="true" />
      <div className="login-brand">
        <img src="/foravento-mark.png" alt="" width="48" height="48" />
        <h1>Foravento</h1>
      </div>
      <div className="login-intro">
        <span className="eyebrow">SUA VIAGEM EM UM SÓ LUGAR</span>
        <h2>Viaje com tudo ao seu alcance.</h2>
        <p>
          {sentTo
            ? `Enviamos um código para ${sentTo}. Digite-o abaixo.`
            : "Digite seu e-mail. Enviaremos um código para você entrar, sem senha."}
        </p>
      </div>
      {!sentTo ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(email);
          }}
        >
          <label>
            E-mail
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="button primary" disabled={busy}>
            {busy ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await auth.verifyCode(sentTo, code);
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
            Código
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={14}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="button primary" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
      )}
      {sentTo && (
        <>
          <button
            className="text-button"
            disabled={busy || wait > 0}
            onClick={() => void send(sentTo)}
          >
            {wait > 0 ? `Reenviar código em ${wait}s` : "Reenviar código"}
          </button>
          <button
            className="text-button"
            onClick={() => {
              setSentTo("");
              setCode("");
              setError("");
            }}
          >
            Usar outro e-mail
          </button>
        </>
      )}
      <p className="muted">
        Sem senha: o acesso é por um código enviado ao seu e-mail.
      </p>
    </main>
  );
}
