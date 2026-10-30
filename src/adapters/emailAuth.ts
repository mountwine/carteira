import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import type { User } from "../domain/models";
import type { EmailCodeAuth } from "../domain/ports";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeCode = (value: string) => value.replace(/\s+/g, "");
export const validCode = (value: string) => /^\d{6,10}$/.test(value);

export function toUser(user: AuthUser): User {
  const email = user.email ?? "";
  const name = user.user_metadata?.name;
  return {
    id: user.id,
    name:
      typeof name === "string" && name.trim()
        ? name.trim()
        : email.split("@")[0] || "Viajante",
    email,
  };
}

export function authMessage(error: unknown): string {
  const {
    message = "",
    code = "",
    status = 0,
  } = (error ?? {}) as {
    message?: string;
    code?: string;
    status?: number;
  };
  const text = `${code} ${message}`.toLowerCase();
  if (/failed to fetch|network|load failed/.test(text))
    return "Sem conexão. Conecte-se à internet para entrar.";
  if (status === 429 || /rate_limit|too many|security purposes/.test(text))
    return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (/otp_expired|expired|invalid|token/.test(text))
    return "Código inválido ou expirado. Peça um novo código.";
  if (/email_address_invalid|invalid.*email/.test(text))
    return "Confira o e-mail digitado.";
  return "Não foi possível entrar. Tente novamente.";
}

export function createEmailAuth(
  client: Pick<SupabaseClient, "auth">,
  onSignedIn: (user: User) => Promise<void> = async () => {},
): EmailCodeAuth {
  const listeners = new Set<(user: User | null) => void>();
  let last: User | null = null;
  const same = (a: User | null, b: User | null) =>
    a?.id === b?.id && a?.name === b?.name && a?.email === b?.email;
  const publish = (user: User | null) => {
    if (same(last, user)) return;
    last = user;
    listeners.forEach((fn) => fn(user));
  };
  client.auth.onAuthStateChange((_event, session) =>
    publish(session ? toUser(session.user) : null),
  );
  return {
    async current() {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(authMessage(error));
      const user = data.session ? toUser(data.session.user) : null;
      if (user) await onSignedIn(user);
      last = user;
      return user;
    },
    async sendCode(email) {
      email = normalizeEmail(email);
      if (!emailPattern.test(email))
        throw new Error("Confira o e-mail digitado.");
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(authMessage(error));
    },
    async verifyCode(email, code) {
      code = normalizeCode(code);
      if (!validCode(code))
        throw new Error("Digite o código numérico recebido por e-mail.");
      const { data, error } = await client.auth.verifyOtp({
        email: normalizeEmail(email),
        token: code,
        type: "email",
      });
      if (error || !data.user)
        throw new Error(authMessage(error ?? { message: "invalid" }));
      await onSignedIn(toUser(data.user));
    },
    async updateName(name) {
      const clean = name.trim();
      if (!clean) throw new Error("Informe seu nome.");
      const { error } = await client.auth.updateUser({ data: { name: clean } });
      if (error) throw new Error(authMessage(error));
    },
    async logout() {
      await client.auth.signOut();
      publish(null);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
