import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  change,
  entity,
  type Entity,
  type Reservation,
} from "../src/domain/entities";
import type { Trip, User } from "../src/domain/models";
import { activityPlaceId, reservationChanges } from "../src/domain/planning";
import { all, put } from "../src/data/database";

const user: User = {
  id: "user-1",
  name: "Pessoa",
  email: "pessoa@example.test",
};
const trip: Trip = {
  id: "trip-1",
  name: "Viagem",
  cover: "",
  startDate: "2026-11-01",
  endDate: "2026-11-10",
  currency: "BRL",
  pace: "balanced",
  destinations: [],
  members: [
    {
      userId: user.id,
      displayName: user.name,
      invitationState: "accepted",
      preferences: {},
    },
  ],
  isDemo: false,
};
const location = {
  name: "Hotel Central",
  address: "Rua Um, 20, São Paulo",
  city: "São Paulo",
  region: "SP",
  country: "Brasil",
  postalCode: "01000-000",
  category: "accommodation.hotel",
  lat: -23.55,
  lng: -46.63,
  providerId: "geoapify-hotel",
  provider: "geoapify",
  attribution: "© OpenStreetMap contributors",
};
const reservation: Reservation = {
  title: "Hotel Central",
  category: "hotel",
  date: "2026-11-02",
  endDate: "2026-11-06",
  time: "15:00",
  endTime: "11:00",
  city: "São Paulo",
  address: location.address,
  location,
  code: "ABC123",
  price: 1000,
  currency: "BRL",
  status: "confirmed",
  notes: "Quarto duplo",
  documentId: "document-1",
  addToItinerary: true,
};

describe("reservation-to-itinerary synchronization", () => {
  it("uses a selected Google ID and clears a stale ID when the place becomes manual", () => {
    expect(activityPlaceId(location, "old-id")).toBe("geoapify-hotel");
    expect(activityPlaceId({ name: "Typed place", provider: "manual" }, "geoapify-hotel")).toBe("");
    expect(activityPlaceId({ name: "Legacy value" }, "legacy-id")).toBe("legacy-id");
  });

  it("persists and reopens the selected structured place on activities and reservations", async () => {
    const activity = entity("activity", {
      title: location.name,
      date: "2026-11-02",
      time: "10:00",
      period: "morning",
      duration: 60,
      fixed: false,
      placeId: location.providerId,
      address: location.address,
      location,
      lat: location.lat,
      lng: location.lng,
      participants: [user.id],
      notes: "",
      order: 1000,
      status: "planned",
      reservationId: "",
    }, trip, user);
    const booking = entity("reservation", reservation, trip, user);
    await put("records", activity);
    await put("records", booking);
    const reopened = await all<Entity<"activity"> | Entity<"reservation">>("records");
    expect(reopened.find((record) => record.id === activity.id)?.data.location).toEqual(location);
    expect(reopened.find((record) => record.id === booking.id)?.data.location).toEqual(location);
  });

  it("preserves a multi-day reservation, structured place and metadata in a linked activity", () => {
    const record = entity("reservation", reservation, trip, user);
    const linked: Entity<"activity"> = {
      ...entity(
        "activity",
        {
          title: "Hotel Central",
          date: reservation.date,
          time: reservation.time,
          period: "afternoon",
          duration: 60,
          fixed: true,
          placeId: location.providerId,
          address: location.address,
          location,
          lat: location.lat,
          lng: location.lng,
          participants: [user.id],
          notes: "Nota personalizada",
          order: 1500,
          status: "done",
          reservationId: record.id,
        },
        trip,
        user,
      ),
      version: 3,
    };

    const changes = reservationChanges(record, [linked], trip, user);
    const synced = changes[0].record as Entity<"activity">;
    expect(synced.data).toMatchObject({
      date: "2026-11-02",
      address: location.address,
      location,
      placeId: "geoapify-hotel",
      lat: -23.55,
      lng: -46.63,
      reservationId: record.id,
      status: "done",
      participants: [user.id],
    });
    expect(synced.data.notes).toContain("ABC123");
    expect(synced.version).toBe(3);
  });
});
