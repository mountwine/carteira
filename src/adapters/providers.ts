import { currentRate } from "./external";
import { distance } from "../domain/planning";
export interface Place {
  id: string;
  name: string;
  city: string;
  category: "photos" | "food" | "shopping" | "attraction";
  lat: number;
  lng: number;
  image: string;
  rating: number;
  address: string;
  hours: string;
  price: string;
  website: string;
  phone: string;
  photoTip: string;
  goldenHour: string;
  source: "mock" | "live";
}
export interface PlacesPort {
  search(query: string): Promise<Place[]>;
  get(id: string): Promise<Place | undefined>;
}
export interface WeatherPort {
  get(
    city: string,
    date: string,
  ): Promise<{
    temperature: number;
    min: number;
    max: number;
    sunset: string;
    description: string;
    source: "mock" | "live";
  }>;
}
export interface FxPort {
  rate(
    from: string,
    to: string,
  ): Promise<{
    rate: number;
    asOf: string;
    source: "mock" | "live" | "cached";
  }>;
}
export interface ProductPort {
  search(
    query: string,
  ): Promise<{ title: string; url: string; source: "mock" }[]>;
}
export interface TranslationPort {
  translate(
    text: string,
    from: string,
    to: string,
  ): Promise<{ text: string; source: "phrasebook" | "unavailable" }>;
}
export const places: Place[] = [
  {
    id: "griffith",
    name: "Griffith Observatory",
    city: "Los Angeles",
    category: "photos",
    lat: 34.1184,
    lng: -118.3004,
    image: "/images/los-angeles.jpg",
    rating: 4.7,
    address: "2800 E Observatory Rd, Los Angeles, CA",
    hours: "Ter–Dom · 12:00–22:00 (exemplo)",
    price: "Entrada livre · exposições à parte",
    website: "https://griffithobservatory.org",
    phone: "+12134730800",
    photoTip: "Terraço oeste para o skyline. Chegue antes do pôr do sol.",
    goldenHour: "16:35 – 17:25",
    source: "mock",
  },
  {
    id: "hollywood",
    name: "Hollywood Sign View",
    city: "Los Angeles",
    category: "photos",
    lat: 34.1341,
    lng: -118.3215,
    image: "/images/hollywood.jpg",
    rating: 4.8,
    address: "Griffith Park, Los Angeles",
    hours: "Trilhas durante o dia (exemplo)",
    price: "Gratuito",
    website: "https://www.laparks.org/griffithpark",
    phone: "",
    photoTip: "Use uma lente mais longa e mantenha-se nas trilhas autorizadas.",
    goldenHour: "16:35 – 17:25",
    source: "mock",
  },
  {
    id: "lunch-la",
    name: "Almoço em Los Feliz",
    city: "Los Angeles",
    category: "food",
    lat: 34.104,
    lng: -118.291,
    image: "/images/lunch.jpg",
    rating: 4.6,
    address: "Los Feliz, Los Angeles",
    hours: "12:00–22:00 · estabelecimento ilustrativo",
    price: "US$ 25–40 · exemplo",
    website: "",
    phone: "",
    photoTip: "Mesa perto da janela para luz natural.",
    goldenHour: "",
    source: "mock",
  },
  {
    id: "grove",
    name: "The Grove",
    city: "Los Angeles",
    category: "shopping",
    lat: 34.0722,
    lng: -118.3579,
    image: "/images/los-angeles.jpg",
    rating: 4.7,
    address: "189 The Grove Dr, Los Angeles",
    hours: "10:00–21:00 (exemplo)",
    price: "Conforme loja",
    website: "https://thegrovela.com",
    phone: "",
    photoTip: "Fachadas e palmeiras no fim da tarde.",
    goldenHour: "16:35 – 17:25",
    source: "mock",
  },
  {
    id: "warner",
    name: "Warner Bros. Studio Tour",
    city: "Los Angeles",
    category: "attraction",
    lat: 34.148,
    lng: -118.337,
    image: "/images/los-angeles.jpg",
    rating: 4.7,
    address: "3400 Warner Blvd, Burbank",
    hours: "Conforme ingresso",
    price: "US$ 75 · exemplo",
    website: "https://www.wbstudiotour.com",
    phone: "",
    photoTip: "Respeite as áreas em que fotografar é permitido.",
    goldenHour: "",
    source: "mock",
  },
  {
    id: "vegas",
    name: "Las Vegas Strip",
    city: "Las Vegas",
    category: "photos",
    lat: 36.1147,
    lng: -115.1728,
    image: "/images/hollywood.jpg",
    rating: 4.6,
    address: "Las Vegas Blvd, Nevada",
    hours: "Área externa · 24h (exemplo)",
    price: "Gratuito",
    website: "https://www.visitlasvegas.com",
    phone: "",
    photoTip:
      "Fotografe os letreiros depois do pôr do sol. Imagem ilustrativa.",
    goldenHour: "16:50 – 17:35",
    source: "mock",
  },
  {
    id: "orlando",
    name: "Lake Eola Park",
    city: "Orlando",
    category: "photos",
    lat: 28.543,
    lng: -81.373,
    image: "/images/los-angeles.jpg",
    rating: 4.7,
    address: "512 E Washington St, Orlando",
    hours: "06:00–00:00 (exemplo)",
    price: "Gratuito",
    website: "https://www.orlando.gov",
    phone: "",
    photoTip: "Reflexos no lago ao entardecer. Imagem ilustrativa.",
    goldenHour: "17:15 – 18:05",
    source: "mock",
  },
];
export const phrasebook = [
  {
    category: "Restaurante",
    pt: "Uma mesa para duas pessoas, por favor.",
    en: "A table for two, please.",
  },
  {
    category: "Restaurante",
    pt: "Tenho alergia a amendoim.",
    en: "I am allergic to peanuts.",
  },
  { category: "Hotel", pt: "Tenho uma reserva.", en: "I have a reservation." },
  {
    category: "Hotel",
    pt: "Qual é o horário do check-out?",
    en: "What time is check-out?",
  },
  {
    category: "Compras",
    pt: "Vocês têm outro tamanho?",
    en: "Do you have another size?",
  },
  { category: "Compras", pt: "Posso experimentar?", en: "May I try it on?" },
  {
    category: "Transporte",
    pt: "Onde fica a estação?",
    en: "Where is the station?",
  },
  {
    category: "Transporte",
    pt: "Quanto custa a passagem?",
    en: "How much is the ticket?",
  },
  {
    category: "Emergência",
    pt: "Preciso de ajuda médica.",
    en: "I need medical help.",
  },
  {
    category: "Emergência",
    pt: "Por favor, chame uma ambulância.",
    en: "Please call an ambulance.",
  },
];
export const providers = {
  places: {
    async search(q: string) {
      return places.filter((p) =>
        normalize(`${p.name} ${p.city} ${p.category}`).includes(normalize(q)),
      );
    },
    async get(id: string) {
      return places.find((p) => p.id === id);
    },
  } satisfies PlacesPort,
  weather: {
    async get(_city: string, _date: string) {
      return {
        temperature: 22,
        min: 14,
        max: 26,
        sunset: "17:18",
        description: "Céu aberto",
        source: "mock" as const,
      };
    },
  } satisfies WeatherPort,
  fx: {
    async rate(from: string, to: string) {
      const q = await currentRate(from, to);
      return {
        rate: q.rate,
        asOf: q.date,
        source: q.cached ? ("cached" as const) : ("live" as const),
      };
    },
  } satisfies FxPort,
  products: {
    async search(q: string) {
      return [
        {
          title: q,
          url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
          source: "mock" as const,
        },
      ];
    },
  } satisfies ProductPort,
  translation: {
    async translate(text: string, from: string, to: string) {
      const match = phrasebook.find(
        (p) => normalize(from === "pt" ? p.pt : p.en) === normalize(text),
      );
      return match
        ? {
            text: to === "en" ? match.en : match.pt,
            source: "phrasebook" as const,
          }
        : {
            text: "Esta frase não está no phrasebook. Abra o tradutor externo para tradução livre.",
            source: "unavailable" as const,
          };
    },
  } satisfies TranslationPort,
};
export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function mapUrl(
  lat: number,
  lng: number,
  provider: "google" | "apple" | "waze" = "google",
) {
  return provider === "apple"
    ? `https://maps.apple.com/?daddr=${lat},${lng}`
    : provider === "waze"
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
export function detour(
  place: Place,
  from: Place | undefined,
  to: Place | undefined,
) {
  if (!from) return null;
  const via =
    distance([from.lat, from.lng], [place.lat, place.lng]) +
    (to ? distance([place.lat, place.lng], [to.lat, to.lng]) : 0);
  const direct = to ? distance([from.lat, from.lng], [to.lat, to.lng]) : 0;
  return Math.max(0, Math.ceil((((via - direct) * 1.3) / 30) * 60));
}

export interface ExternalReservationsPort {
  import(
    reference: string,
  ): Promise<{ status: "unavailable"; message: string }>;
}
export const externalReservations: ExternalReservationsPort = {
  async import() {
    return {
      status: "unavailable",
      message:
        "Importação externa não configurada. Cadastre a reserva manualmente.",
    };
  },
};
