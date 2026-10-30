import { expect, it } from "vitest";
import { homeContext, type Destination, type Trip } from "../src/domain/models";
import { homeHeadline } from "../src/domain/homeHeadline";

const stop = (
  city: string,
  startDate: string,
  endDate: string,
): Destination => ({
  id: city,
  city,
  country: "",
  startDate,
  endDate,
  transport: [],
});
const trip: Trip = {
  id: "t",
  name: "Costa Oeste",
  cover: "",
  startDate: "2027-01-01",
  endDate: "2027-01-10",
  currency: "USD",
  pace: "balanced",
  isDemo: false,
  members: [],
  destinations: [
    stop("Los Angeles", "2027-01-01", "2027-01-05"),
    stop("Las Vegas", "2027-01-06", "2027-01-10"),
  ],
};
const at = (date: string) =>
  homeHeadline(homeContext(trip, new Date(date + "T12:00:00Z")), trip);

it("durante a viagem, mostra a cidade do dia e o dia da semana", () => {
  expect(at("2027-01-01")).toEqual({
    city: "Los Angeles",
    tail: "sexta-feira.",
  });
  expect(at("2027-01-08")).toEqual({ city: "Las Vegas", tail: "sexta-feira." });
});
it("muda de cidade no dia da troca, e não antes", () => {
  expect(at("2027-01-05").city).toBe("Los Angeles");
  expect(at("2027-01-06").city).toBe("Las Vegas");
});
it("antes da viagem, conta os dias; depois, se despede", () => {
  expect(at("2026-12-25")).toEqual({ city: "Los Angeles", tail: "em 7 dias." });
  expect(at("2026-12-31").tail).toBe("amanhã.");
  expect(at("2027-01-20")).toEqual({
    city: "Las Vegas",
    tail: "até a próxima.",
  });
});
