import type { Trip, User, HomeData } from "../domain/models";
export function demoTrip(user: User): Trip {
  return {
    id: crypto.randomUUID(),
    name: "USA 2027",
    cover: "/images/los-angeles.jpg",
    startDate: "2027-01-20",
    endDate: "2027-02-07",
    currency: "USD",
    pace: "balanced",
    isDemo: true,
    destinations: [
      {
        id: crypto.randomUUID(),
        city: "Los Angeles",
        country: "Estados Unidos",
        startDate: "2027-01-20",
        endDate: "2027-02-07",
        timezone: "America/Los_Angeles",
        transport: ["car"],
      },
    ],
    members: [
      {
        userId: user.id,
        displayName: user.name,
        invitationState: "accepted",
        preferences: {},
      },
    ],
  };
}
export const demoHome: HomeData = {
  source: "mock",
  weather: { temperature: 22, min: 14, max: 26, sunset: "17:18" },
  current: {
    title: "Griffith Observatory",
    time: "09:30 – 11:30",
    image: "/images/los-angeles.jpg",
    location: "Los Angeles, CA",
    coordinates: [34.1184, -118.3004],
    duration: "~2h",
  },
  next: {
    title: "Almoço",
    time: "Ainda não escolhido",
    image: "/images/lunch.jpg",
    location: "Perto do próximo ponto",
    coordinates: [34.1184, -118.3004],
    duration: "",
  },
  suggestion: {
    title: "Hollywood Sign View",
    image: "/images/hollywood.jpg",
    rating: "4,8",
    detour: "+7 min",
    light: "Golden hour · 16:45",
    coordinates: [34.1341, -118.3215],
  },
  preparation: 72,
  pending: [
    "Confirmar reserva do carro",
    "Definir seguro viagem",
    "Conferir documentos dos viajantes",
  ],
  spending: 142,
  budget: 400,
  fixedTime: "14:00",
  fixedTitle: "Warner Bros. Studio Tour",
  travel: {
    minutes: 18,
    kilometers: 7.4,
    temperature: 19,
    photoLabel: "Boa luz",
  },
  summary: { places: 12, photos: 48, favorites: 6 },
};
export const emptyHome: HomeData = {
  source: "unavailable",
  weather: null,
  current: null,
  next: null,
  suggestion: null,
  preparation: 0,
  pending: [],
  spending: null,
  budget: null,
  fixedTime: null,
  fixedTitle: null,
  travel: null,
  summary: null,
};
