import {
  entity,
  type AnyEntity,
  type Activity,
  type Kind,
} from "../domain/entities";
import type { Trip, User } from "../domain/models";
import { places } from "./providers";
export function fullSeed(trip: Trip, user: User): AnyEntity[] {
  const records: AnyEntity[] = [];
  const add = <K extends Kind>(
    kind: K,
    data: Parameters<typeof entity<K>>[1],
    visibility: "trip" | "private" = "trip",
  ) => {
    const r = entity(kind, data, trip, user, visibility);
    records.push(r as AnyEntity);
    return r;
  };
  const date = trip.startDate === "2027-01-20" ? "2027-01-22" : trip.startDate;
  const activity = (
    title: string,
    time: string,
    duration: number,
    placeId: string,
    fixed = false,
  ): Activity => {
    const p = places.find((p) => p.id === placeId);
    return {
      title,
      date,
      time,
      period: "morning",
      duration,
      fixed,
      placeId,
      address: p?.address ?? "",
      lat: p?.lat ?? null,
      lng: p?.lng ?? null,
      participants: [user.id],
      notes: "",
      order: Number(time.slice(0, 2)) * 60 + Number(time.slice(3)),
      status: "planned",
      reservationId: "",
    };
  };
  add("activity", activity("Griffith Observatory", "09:30", 120, "griffith"));
  add("activity", activity("Almoço em Los Feliz", "12:00", 60, "lunch-la"));
  const reservation = add("reservation", {
    title: "Warner Bros. Studio Tour",
    category: "tour",
    date,
    endDate: date,
    time: "14:00",
    endTime: "16:30",
    city: "Los Angeles",
    address: places.find((p) => p.id === "warner")!.address,
    code: "DEMO-TOUR-001",
    price: 150,
    currency: "USD",
    status: "confirmed",
    notes: "Reserva fictícia para testar a integração.",
    documentId: "",
    addToItinerary: true,
  });
  add("activity", {
    ...activity("Warner Bros. Studio Tour", "14:00", 150, "warner", true),
    reservationId: reservation.id,
  });
  add("activity", {
    ...activity("Golden hour · Hollywood Sign", "17:00", 45, "hollywood"),
    period: "evening",
  });
  add("reservation", {
    title: "Voo São Paulo → Los Angeles",
    category: "flight",
    date: trip.startDate,
    endDate: trip.startDate,
    time: "08:00",
    endTime: "12:00",
    city: "Los Angeles",
    address: "Los Angeles International Airport",
    code: "DEMO-FLIGHT",
    price: 1800,
    currency: "USD",
    status: "confirmed",
    notes: "Dados fictícios · horários locais; confirme sempre na companhia.",
    documentId: "",
    addToItinerary: false,
  });
  add("reservation", {
    title: "Hotel de demonstração · Los Angeles",
    category: "hotel",
    date: trip.startDate,
    endDate: "2027-01-25",
    time: "15:00",
    endTime: "11:00",
    city: "Los Angeles",
    address: "West Hollywood, Los Angeles",
    code: "DEMO-HOTEL",
    price: 1100,
    currency: "USD",
    status: "confirmed",
    notes: "Hospedagem fictícia",
    documentId: "",
    addToItinerary: false,
  });
  add("budget", {
    title: "Orçamento da viagem",
    total: 5000,
    currency: "USD",
    categories: {
      Alimentação: 800,
      Transporte: 700,
      Hospedagem: 1800,
      Atrações: 700,
      Compras: 800,
      Outros: 200,
    },
  });
  add("expense", {
    title: "Almoço em Los Feliz",
    date,
    amount: 68,
    currency: "USD",
    rate: 1,
    category: "Alimentação",
    payer: user.id,
    split: [user.id],
    shoppingId: "",
    notes: "Despesa demonstrativa",
  });
  add("expense", {
    title: "Transporte do aeroporto",
    date: trip.startDate,
    amount: 74,
    currency: "USD",
    rate: 1,
    category: "Transporte",
    payer: user.id,
    split: [],
    shoppingId: "",
    notes: "",
  });
  const bag = add("bag", {
    title: "Mala principal",
    traveler: user.id,
    type: "checked",
    limit: 23,
    actualWeight: 18.4,
  });
  add("bag", {
    title: "Mochila de fotografia",
    traveler: user.id,
    type: "backpack",
    limit: 8,
    actualWeight: 4.1,
  });
  for (const [title, category, weight] of [
    ["Camisetas", "Roupas", 0.8],
    ["Tênis", "Calçados", 0.9],
    ["Necessaire", "Higiene", 0.6],
  ] as const)
    add("packing", {
      title,
      bagId: bag.id,
      traveler: user.id,
      category,
      weight,
      quantity: 1,
      packed: true,
      returnPacked: false,
      shoppingId: "",
    });
  add(
    "shopping",
    {
      title: "Tênis para caminhada",
      brand: "Marca de exemplo",
      image: "",
      price: 110,
      targetPrice: 100,
      currency: "USD",
      store: "The Grove",
      url: "",
      priority: "high",
      size: "US 10",
      notes: "Conferir numeração na loja",
      bought: false,
      actualPrice: 0,
      bagId: "",
      weight: 0.9,
    },
    "private",
  );
  add("shopping", {
    title: "Lembrança de Los Angeles",
    brand: "",
    image: "",
    price: 25,
    targetPrice: 25,
    currency: "USD",
    store: "Loja de lembranças",
    url: "",
    priority: "medium",
    size: "",
    notes: "",
    bought: true,
    actualPrice: 25,
    bagId: "",
    weight: 0.3,
  });
  for (const [title, done] of [
    ["Conferir passaporte", true],
    ["Confirmar reserva do carro", false],
    ["Definir seguro viagem", false],
  ] as const)
    add("checklist", {
      title,
      phase: "before",
      due: trip.startDate,
      assignee: user.id,
      done,
      suggested: true,
    });
  add("checklist", {
    title: "Conferir bagagem para voltar",
    phase: "return",
    due: trip.endDate,
    assignee: user.id,
    done: false,
    suggested: true,
  });
  const doc = add("document", {
    title: "Confirmação de tour · fictícia",
    category: "ticket",
    expires: trip.endDate,
    notes:
      "DOCUMENTO FICTÍCIO. Não tem validade. Nenhum número de documento pessoal real.",
    filePath: "",
    fileName: "",
    mime: "text/plain",
    essential: true,
    fictitious: true,
  });
  reservation.data.documentId = doc.id;
  add(
    "document",
    {
      title: "Passaporte de exemplo",
      category: "passport",
      expires: "2031-12-31",
      notes:
        "DOCUMENTO FICTÍCIO · sem número, nome legal ou imagem de passaporte.",
      filePath: "",
      fileName: "",
      mime: "text/plain",
      essential: true,
      fictitious: true,
    },
    "private",
  );
  add("saved", {
    title: "Hollywood Sign View",
    placeId: "hollywood",
    notes: "Prioridade para fotografia",
    tags: ["foto", "golden hour"],
    priority: "high",
  });
  const demoPhoto = add("document", {
    title: "Foto de referência · demonstração",
    category: "other",
    expires: "",
    notes: "Foto pública de referência, não é uma foto pessoal.",
    filePath: "",
    fileName: "los-angeles.jpg",
    mime: "image/jpeg",
    essential: true,
    fictitious: true,
    demoAsset: "/images/los-angeles.jpg",
  });
  add("memory", {
    title: "Primeiro pôr do sol em LA",
    date,
    notes: "A cidade inteira acendendo lá embaixo. Memória de demonstração.",
    rating: 5,
    placeId: "griffith",
    favorite: true,
    photoIds: [demoPhoto.id],
  });
  add("day", {
    title: "Dia em Los Angeles",
    date,
    intensity: "balanced",
    notes: "Fotografia e cinema.",
  });
  if (trip.startDate === "2027-01-20") {
    for (const [placeId, day] of [
      ["vegas", "2027-01-27"],
      ["orlando", "2027-02-01"],
    ] as const) {
      const place = places.find((p) => p.id === placeId)!;
      add("activity", {
        ...activity(place.name, "17:00", 90, placeId),
        date: day,
        period: "afternoon",
      });
      add("reservation", {
        title: `Hotel de demonstração · ${place.city}`,
        category: "hotel",
        date: placeId === "vegas" ? "2027-01-26" : "2027-01-30",
        endDate: placeId === "vegas" ? "2027-01-29" : trip.endDate,
        time: "15:00",
        endTime: "11:00",
        city: place.city,
        address: `Centro de ${place.city} · endereço fictício`,
        code: `DEMO-${placeId.toUpperCase()}`,
        price: 450,
        currency: "USD",
        status: "confirmed",
        notes: "Hospedagem fictícia, sem reserva real.",
        documentId: "",
        addToItinerary: false,
      });
    }
    add("saved", {
      title: "Almoço em Los Feliz",
      placeId: "lunch-la",
      notes: "Opção de restaurante para o dia",
      tags: ["restaurante"],
      priority: "medium",
    });
    add(
      "note",
      {
        title: "Anotações da chegada",
        date: trip.startDate,
        notes:
          "Separar um tempo para descansar após o voo. Nota demonstrativa.",
      },
      "private",
    );
  }
  return records;
}
