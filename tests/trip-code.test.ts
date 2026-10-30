import { describe, expect, it, vi } from "vitest";
import { createTripCodeApi } from "../src/adapters/tripCodeApi";
import {
  TRIP_CODE_ALPHABET,
  codeFormatMessage,
  formatTripCode,
  joinFailure,
  normalizeTripCode,
  validTripCode,
} from "../src/domain/tripCode";

describe("código de viagem", () => {
  it("usa 12 símbolos sem ambíguos", () => {
    expect(TRIP_CODE_ALPHABET).toHaveLength(12);
    for (const bad of ["0", "1", "8", "B", "O", "I", "L"])
      expect(TRIP_CODE_ALPHABET).not.toContain(bad);
  });
  it("normaliza o que a pessoa digita", () => {
    expect(normalizeTripCode(" 444-4e2 ")).toBe("4444E2");
    expect(normalizeTripCode("a3f9c7zzz")).toBe("A3F9C7");
  });
  it("valida só códigos completos com símbolos permitidos", () => {
    expect(validTripCode("4444E2")).toBe(true);
    expect(validTripCode("444E2")).toBe(false);
    expect(validTripCode("4444E0")).toBe(false);
    expect(validTripCode("B444E2")).toBe(false);
  });
  it("mostra em dois grupos e explica o erro de formato", () => {
    expect(formatTripCode("4444E2")).toBe("444 4E2");
    expect(codeFormatMessage("44")).toMatch(/6 caracteres/);
    expect(codeFormatMessage("4444E0")).toMatch(/0 com O/);
  });
  it("traduz as falhas ao entrar", () => {
    expect(joinFailure("invalid")).toMatch(/não encontrado/);
    expect(joinFailure("locked")).toMatch(/uma hora/);
    expect(joinFailure()).toMatch(/Tente novamente/);
  });
});

function client(over: Record<string, unknown> = {}) {
  const rpc = vi.fn(async (name: string) => ({
    data: (over[name] as unknown) ?? null,
    error: (over[`${name}:error`] as { message: string } | undefined) ?? null,
  }));
  const table = (rows: Record<string, unknown>) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: rows.member, error: null }),
        }),
        maybeSingle: async () => ({ data: rows.trip, error: null }),
      }),
    }),
  });
  const from = vi.fn((name: string) =>
    table({
      trip: over.trip,
      member: name === "cloud_members" ? over.member : undefined,
    }),
  );
  return { rpc, from } as never;
}

describe("ligação do código com o Supabase", () => {
  it("entra pelo código com os nomes de parâmetro do SQL e devolve a viagem", async () => {
    const c = client({ join_cloud_trip: { ok: true, trip_id: "t1" } });
    expect(await createTripCodeApi(c).join("4444E2", "Maya")).toBe("t1");
    expect(
      (c as never as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).toHaveBeenCalledWith("join_cloud_trip", {
      p_code: "4444E2",
      p_name: "Maya",
    });
  });
  it("mostra a mensagem certa quando o código não existe ou bloqueou", async () => {
    await expect(
      createTripCodeApi(
        client({ join_cloud_trip: { ok: false, reason: "invalid" } }),
      ).join("4444E2", "M"),
    ).rejects.toThrow(/não encontrado/);
    await expect(
      createTripCodeApi(
        client({ join_cloud_trip: { ok: false, reason: "locked" } }),
      ).join("4444E2", "M"),
    ).rejects.toThrow(/uma hora/);
  });
  it("lê o código e o papel; sem a viagem na nuvem devolve null", async () => {
    const api = createTripCodeApi(
      client({ trip: { join_code: "4444E2" }, member: { role: "owner" } }),
    );
    expect(await api.info("t1", "u1")).toEqual({
      code: "4444E2",
      role: "owner",
    });
    expect(await createTripCodeApi(client({})).info("t1", "u1")).toBeNull();
  });
  it("gera código novo e trata erros de permissão e de dono", async () => {
    expect(
      await createTripCodeApi(client({ rotate_cloud_code: "A3F9C7" })).rotate(
        "t1",
      ),
    ).toBe("A3F9C7");
    await expect(
      createTripCodeApi(
        client({ "rotate_cloud_code:error": { message: "ACCESS" } }),
      ).rotate("t1"),
    ).rejects.toThrow(/Só o dono/);
    await expect(
      createTripCodeApi(
        client({ "leave_cloud_trip:error": { message: "OWNER" } }),
      ).leave("t1"),
    ).rejects.toThrow(/dono da viagem não pode sair/);
  });
});
