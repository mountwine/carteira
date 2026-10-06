import { describe, it, expect } from "vitest";
import { homeContext } from "./models";
import { demoTrip } from "../adapters/seed";
const trip = demoTrip({ id: "test", name: "Test", email: "test@example.test" });
describe("Home: limites inclusivos e fuso do destino", () => {
  it("antes, durante e depois", () => {
    expect(homeContext(trip, new Date("2027-01-19T20:00:00Z")).phase).toBe(
      "before",
    );
    expect(homeContext(trip, new Date("2027-01-20T20:00:00Z")).day).toBe(1);
    expect(homeContext(trip, new Date("2027-02-07T20:00:00Z")).phase).toBe(
      "during",
    );
    expect(homeContext(trip, new Date("2027-02-07T20:00:00Z")).totalDays).toBe(
      19,
    );
    expect(homeContext(trip, new Date("2027-02-08T20:00:00Z")).phase).toBe(
      "after",
    );
  });
  it("não troca para o dia UTC antes da meia-noite em LA", () => {
    expect(homeContext(trip, new Date("2027-01-20T03:00:00Z")).phase).toBe(
      "before",
    );
  });
  it("preview não altera as datas persistentes da viagem", () => {
    expect(homeContext(trip, new Date(), "2027-01-22").day).toBe(3);
    expect(trip.startDate).toBe("2027-01-20");
  });
  it("contagem regressiva não depende do horário de verão", () => {
    expect(homeContext(trip, new Date(), "2026-10-04").daysUntil).toBe(108);
  });
});
