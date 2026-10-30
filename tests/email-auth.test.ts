import { describe, expect, it, vi } from "vitest";
import {
  authMessage,
  createEmailAuth,
  normalizeCode,
  normalizeEmail,
  toUser,
  validCode,
} from "../src/adapters/emailAuth";

const authUser = (extra: Record<string, unknown> = {}) =>
  ({
    id: "u1",
    email: "leo@example.com",
    user_metadata: {},
    ...extra,
  }) as never;

function fakeClient() {
  let listener: ((event: string, session: unknown) => void) | undefined;
  const auth = {
    onAuthStateChange: vi.fn((fn) => {
      listener = fn;
      return { data: { subscription: { unsubscribe() {} } } };
    }),
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    signInWithOtp: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({
      data: { user: authUser() },
      error: null,
    })),
    updateUser: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  };
  return {
    client: { auth } as never,
    auth,
    emit: (s: unknown) => listener?.("X", s),
  };
}

describe("login por código de e-mail", () => {
  it("normaliza e-mail e código, aceitando 6 a 10 dígitos", () => {
    expect(normalizeEmail("  Leo@Example.COM ")).toBe("leo@example.com");
    expect(normalizeCode(" 123 456 ")).toBe("123456");
    expect(validCode("123456")).toBe(true);
    expect(validCode("1234567890")).toBe(true);
    expect(validCode("12345")).toBe(false);
    expect(validCode("12345678901")).toBe(false);
    expect(validCode("12a456")).toBe(false);
  });

  it("monta o usuário a partir do e-mail ou do nome salvo", () => {
    expect(toUser(authUser())).toEqual({
      id: "u1",
      name: "Leo",
      email: "leo@example.com",
    });
    expect(
      toUser(authUser({ user_metadata: { name: " Leonardo " } })).name,
    ).toBe("Leonardo");
  });

  it("envia o código com criação de conta e e-mail em minúsculas", async () => {
    const { client, auth } = fakeClient();
    await createEmailAuth(client).sendCode(" Leo@Example.com ");
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "leo@example.com",
      options: { shouldCreateUser: true },
    });
  });

  it("recusa e-mail inválido sem chamar o servidor", async () => {
    const { client, auth } = fakeClient();
    await expect(createEmailAuth(client).sendCode("leo")).rejects.toThrow(
      "Confira o e-mail",
    );
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("confere o código do tipo e-mail e avisa o app que entrou", async () => {
    const { client, auth } = fakeClient();
    const signedIn = vi.fn(async () => {});
    await createEmailAuth(client, signedIn).verifyCode(
      "Leo@Example.com",
      "123 456",
    );
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "leo@example.com",
      token: "123456",
      type: "email",
    });
    expect(signedIn).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1", email: "leo@example.com" }),
    );
  });

  it("recusa código fora do formato sem chamar o servidor", async () => {
    const { client, auth } = fakeClient();
    await expect(
      createEmailAuth(client).verifyCode("a@b.co", "12"),
    ).rejects.toThrow("código numérico");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("traduz os erros do servidor", async () => {
    expect(
      authMessage({ code: "otp_expired", message: "Token has expired" }),
    ).toMatch(/inválido ou expirado/);
    expect(authMessage({ status: 429, message: "x" })).toMatch(
      /Muitas tentativas/,
    );
    expect(authMessage({ message: "Failed to fetch" })).toMatch(/Sem conexão/);
    expect(authMessage(new Error("outra coisa"))).toMatch(/Tente novamente/);
    const { client, auth } = fakeClient();
    auth.verifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "otp_expired", message: "expired" },
    } as never);
    await expect(
      createEmailAuth(client).verifyCode("a@b.co", "123456"),
    ).rejects.toThrow(/inválido ou expirado/);
  });

  it("restaura a sessão guardada e avisa só quando o usuário muda", async () => {
    const { client, auth, emit } = fakeClient();
    auth.getSession.mockResolvedValueOnce({
      data: { session: { user: authUser() } },
      error: null,
    } as never);
    const signedIn = vi.fn(async () => {});
    const service = createEmailAuth(client, signedIn);
    const seen = vi.fn();
    service.subscribe(seen);
    expect((await service.current())?.id).toBe("u1");
    expect(signedIn).toHaveBeenCalledTimes(1);
    emit({ user: authUser() });
    expect(seen).not.toHaveBeenCalled();
    emit({ user: authUser({ user_metadata: { name: "Leonardo" } }) });
    expect(seen).toHaveBeenCalledTimes(1);
    emit(null);
    expect(seen).toHaveBeenLastCalledWith(null);
  });

  it("atualiza o nome e sai da conta", async () => {
    const { client, auth } = fakeClient();
    const service = createEmailAuth(client);
    await service.updateName("  Leonardo ");
    expect(auth.updateUser).toHaveBeenCalledWith({
      data: { name: "Leonardo" },
    });
    await expect(service.updateName("  ")).rejects.toThrow("Informe seu nome");
    const seen = vi.fn();
    service.subscribe(seen);
    await service.logout();
    expect(auth.signOut).toHaveBeenCalled();
  });
});
