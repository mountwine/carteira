import { beforeEach, describe, expect, it, vi } from "vitest";
import { readLastView, writeLastView } from "../src/app/lastView";

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  });
});

describe("tela lembrada ao atualizar a página", () => {
  it("guarda e devolve a viagem e a tela por pessoa", () => {
    writeLastView("u1", { tripId: "t1", screen: "Gastos" });
    expect(readLastView("u1")).toEqual({ tripId: "t1", screen: "Gastos" });
    expect(readLastView("u2")).toBeNull();
  });
  it("esquece quando a pessoa volta para Minhas viagens", () => {
    writeLastView("u1", { tripId: "t1", screen: "Hoje" });
    writeLastView("u1", null);
    expect(readLastView("u1")).toBeNull();
  });
  it("usa o Início quando a tela guardada não pode ser reaberta", () => {
    writeLastView("u1", { tripId: "t1", screen: "Configurações" });
    expect(readLastView("u1")?.screen).toBe("Hoje");
  });
  it("ignora dado corrompido e armazenamento indisponível", () => {
    storage.set("travel-os:last-view:u1", "{nao é json");
    expect(readLastView("u1")).toBeNull();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {},
    });
    expect(readLastView("u1")).toBeNull();
    expect(() =>
      writeLastView("u1", { tripId: "t", screen: "Hoje" }),
    ).not.toThrow();
  });
});
