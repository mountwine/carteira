export interface User {
  id: string;
  name: string;
  email: string;
}
export interface PlaceData {
  name: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lng?: number;
  providerId?: string;
  provider?: string;
}
export interface Destination {
  place?: PlaceData;
  id: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  transport: string[];
}
export interface TripMember {
  userId: string;
  displayName: string;
  invitationState: "accepted" | "pending";
  preferences: Record<string, unknown>;
}
export interface Trip {
  origin?: PlaceData;
  coverPosition?: number;
  deleted?: boolean;
  version?: number;
  id: string;
  name: string;
  cover: string;
  startDate: string;
  endDate: string;
  currency: string;
  pace: "relaxed" | "balanced" | "intense";
  destinations: Destination[];
  members: TripMember[];
  isDemo: boolean;
}
export type Phase = "before" | "during" | "after";
export interface HomeContext {
  phase: Phase;
  date: string;
  localHour: number;
  day: number;
  totalDays: number;
  daysUntil: number;
  destination: Destination | undefined;
}
export function dateInZone(now: Date, timezone?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
const dayNumber = (date: string) => Date.parse(date + "T00:00:00Z") / 86400000;
export function homeContext(
  trip: Trip,
  now: Date,
  previewDate?: string,
): HomeContext {
  const destination =
    trip.destinations.find((d) => {
      const local = dateInZone(now, d.timezone);
      return local >= d.startDate && local <= d.endDate;
    }) ??
    [...trip.destinations]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .find((d) => dateInZone(now, d.timezone) < d.startDate) ??
    [...trip.destinations].sort((a, b) =>
      b.endDate.localeCompare(a.endDate),
    )[0];
  const date = previewDate ?? dateInZone(now, destination?.timezone);
  const localHour = previewDate
    ? 9
    : Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: destination?.timezone,
          hour: "numeric",
          hourCycle: "h23",
        }).format(now),
      );
  return {
    localHour,
    phase:
      date < trip.startDate
        ? "before"
        : date > trip.endDate
          ? "after"
          : "during",
    date,
    day: Math.max(1, dayNumber(date) - dayNumber(trip.startDate) + 1),
    totalDays: dayNumber(trip.endDate) - dayNumber(trip.startDate) + 1,
    daysUntil: Math.max(0, dayNumber(trip.startDate) - dayNumber(date)),
    destination:
      trip.destinations.find((d) => date >= d.startDate && date <= d.endDate) ??
      destination,
  };
}
export interface ActivityPreview {
  title: string;
  time: string;
  image: string;
  location: string;
  coordinates: [number, number];
  duration: string;
}
export interface HomeData {
  source: "mock" | "unavailable";
  weather: {
    temperature: number;
    min: number;
    max: number;
    sunset: string;
  } | null;
  current: ActivityPreview | null;
  next: ActivityPreview | null;
  suggestion: {
    title: string;
    image: string;
    rating: string;
    detour: string;
    light: string;
    coordinates: [number, number];
  } | null;
  preparation: number;
  pending: string[];
  spending: number | null;
  budget: number | null;
  fixedTime: string | null;
  fixedTitle: string | null;
  travel: {
    minutes: number;
    kilometers: number;
    temperature: number;
    photoLabel: string;
  } | null;
  summary: { places: number; photos: number; favorites: number } | null;
}
