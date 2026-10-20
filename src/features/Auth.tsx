import { useState } from "react";
import { services } from "../adapters";
import { resetPassword } from "../adapters/local";
export function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState("");
  return (
    <main className="local-login">
      <div className="login-brand">
        <img src="/foravento-mark.png" alt="" width="48" height="48" />
        <h1>Foravento</h1>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            if (mode === "signup") {
              const code = await services.auth.signup(
                String(f.get("name")),
                String(f.get("email")),
                String(f.get("password")),
              );
              setRecovery(code);
            } else if (mode === "reset") {
              await resetPassword(
                String(f.get("email")),
                String(f.get("recovery")),
                String(f.get("password")),
              );
              setMode("login");
              setError("Senha atualizada neste dispositivo.");
            } else
              await services.auth.login(
                String(f.get("email")),
                String(f.get("password")),
              );
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Não foi possível entrar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "signup" && (
          <label>
            Nome
            <input name="name" autoComplete="name" required />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {mode === "reset" && (
          <>
            <p>
              Use a chave entregue ao criar sua conta. Não há envio de email
              nesta versão local.
            </p>
            <label>
              Chave de recuperação
              <input name="recovery" required />
            </label>
          </>
        )}
        <label>
          {mode === "reset" ? "Nova senha" : "Senha"}
          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Aguarde…"
            : mode === "login"
              ? "Entrar"
              : mode === "signup"
                ? "Criar conta"
                : "Atualizar senha"}
        </button>
      </form>
      {recovery && <p>Guarde sua chave de recuperação: {recovery}</p>}
      <button
        className="text-button"
        onClick={() => setMode(mode === "reset" ? "login" : "reset")}
      >
        Esqueci minha senha
      </button>
      <button
        className="text-button"
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
      >
        {mode === "signup" ? "Entrar" : "Criar conta"}
      </button>
      <p className="muted">Conta e dados salvos somente neste dispositivo.</p>
    </main>
  );
}
