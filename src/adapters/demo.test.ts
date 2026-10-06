import { it, expect, vi } from "vitest";
import { demoAuth, demoTrips } from "./demo";
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});
it("sessão demo, seed idempotente, isolamento por usuário e logout", async () => {
  await demoAuth.enterDemo!();
  const user = (await demoAuth.current())!;
  const trip = await demoTrips.createDemo(user);
  expect((await demoTrips.createDemo(user)).id).toBe(trip.id);
  expect(await demoTrips.list(user.id)).toHaveLength(1);
  expect(await demoTrips.list("another-user")).toHaveLength(0);
  await demoAuth.logout();
  expect(await demoAuth.current()).toBeNull();
  expect(await demoTrips.list(user.id)).toHaveLength(1);
});
it("não simula validação de senha nem cadastro real", async () => {
  await expect(demoAuth.login("x", "secret")).rejects.toThrow("Supabase");
  expect([...storage.values()].join("")).not.toContain("secret");
});
