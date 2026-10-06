import type { AuthPort } from "../domain/ports";
import type { User, Trip } from "../domain/models";
import { all, get, put } from "../data/database";
import { listLocalTrips } from "./tripManagement";
interface Account {
  id: string;
  user: User;
  salt: string;
  hash: string;
  recovery: string;
}
const sessionKey = "travel-os:session:v2";
const listeners = new Set<(u: User | null) => void>();
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
async function digest(value: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode(salt),
          iterations: 210000,
          hash: "SHA-256",
        },
        key,
        256,
      ),
    ),
  );
}
function session(user: User | null) {
  if (user) localStorage.setItem(sessionKey, JSON.stringify(user));
  else localStorage.removeItem(sessionKey);
  listeners.forEach((fn) => fn(user));
}
export const localAuth: AuthPort = {
  async current() {
    const raw =
      localStorage.getItem(sessionKey) ??
      localStorage.getItem("travel-os:demo-session:v1");
    if (!raw) return null;
    let user: User;
    try {
      user = JSON.parse(raw);
    } catch {
      throw new Error(
        "Não foi possível ler sua sessão. Os dados locais foram preservados.",
      );
    }
    if (!(await get("accounts", user.id)))
      localStorage.setItem("travel-os:legacy-owner", user.id);
    session(user);
    await migrateStorage(user);
    return user;
  },
  async login(email, password) {
    const account = (await all<Account>("accounts")).find(
      (a) => a.user.email === email.trim().toLowerCase(),
    );
    if (!account || (await digest(password, account.salt)) !== account.hash)
      throw new Error("Email ou senha incorretos neste dispositivo.");
    session(account.user);
    await migrateStorage(account.user);
  },
  async signup(name, email, password) {
    email = email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 8 ||
      !name.trim()
    )
      throw new Error(
        "Informe nome, email válido e senha com pelo menos 8 caracteres.",
      );
    if ((await all<Account>("accounts")).some((a) => a.user.email === email))
      throw new Error("Já existe uma conta local com este email.");
    const legacy = localStorage.getItem("travel-os:legacy-owner");
    const user = {
      id: legacy ?? crypto.randomUUID(),
      name: name.trim(),
      email,
    };
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const recovery = hex(crypto.getRandomValues(new Uint8Array(16)));
    await put("accounts", {
      id: user.id,
      user,
      salt,
      hash: await digest(password, salt),
      recovery: await digest(recovery, salt),
    });
    localStorage.removeItem("travel-os:legacy-owner");
    if (typeof sessionStorage !== "undefined")
      sessionStorage.setItem("travel-os:recovery", recovery);
    session(user);
    await migrateStorage(user);
    return recovery;
  },
  async logout() {
    session(null);
    localStorage.removeItem("travel-os:demo-session:v1");
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
export async function resetPassword(
  email: string,
  code: string,
  password: string,
) {
  const account = (await all<Account>("accounts")).find(
    (a) => a.user.email === email.trim().toLowerCase(),
  );
  if (
    !account ||
    (await digest(code.trim(), account.salt)) !== account.recovery
  )
    throw new Error("Email ou chave de recuperação inválidos.");
  if (password.length < 8) throw new Error("Use pelo menos 8 caracteres.");
  await put("accounts", {
    ...account,
    hash: await digest(password, account.salt),
  });
}
export async function migrateStorage(user: User) {
  const marker = `v1.1:${user.id}`;
  if (await get("settings", marker)) return;
  await listLocalTrips(user.id);
  const records = await all<import("../domain/entities").AnyEntity>("records");
  for (const record of records) {
    if (record.kind === "activity" && !record.data.time && !record.deleted)
      await put("records", {
        ...record,
        data: { ...record.data, needsTime: true },
      });
  }
  await put("settings", {
    id: marker,
    version: 2,
    at: new Date().toISOString(),
  });
}
export function persistTrip(trip: Trip) {
  const key = "travel-os:trips:v1";
  const trips = JSON.parse(localStorage.getItem(key) ?? "[]") as Trip[];
  const current = trips.find((t) => t.id === trip.id);
  if (current && (current.version ?? 1) !== (trip.version ?? 1))
    throw new Error(
      "Esta viagem foi alterada em outra janela. Reabra antes de salvar.",
    );
  localStorage.setItem(
    key,
    JSON.stringify([
      ...trips.filter((t) => t.id !== trip.id),
      { ...trip, version: (trip.version ?? 0) + 1 },
    ]),
  );
}
export async function localTrips(userId: string) {
  return (await listLocalTrips(userId)).filter((t) => !t.deleted);
}

export async function accountConfigured(user: User) {
  return !!(await get<Account>("accounts", user.id));
}
export async function updateAccount(user: User) {
  const account = await get<Account>("accounts", user.id);
  if (!user.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))
    throw new Error("Informe nome e email válidos.");
  const duplicate = (await all<Account>("accounts")).some(
    (a) => a.id !== user.id && a.user.email === user.email,
  );
  if (duplicate) throw new Error("Este email já pertence a uma conta local.");
  if (account) await put("accounts", { ...account, user });
  session(user);
}
