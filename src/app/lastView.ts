/** Remembers which trip and screen were open, so reloading the page returns to them. */
export const RESTORABLE_SCREENS = [
  "Hoje",
  "Roteiro",
  "Álbum",
  "Mais",
  "Bagagem",
  "Reservas",
  "Documentos",
  "Gastos",
  "Compras",
  "Conversor",
  "Viajantes",
  "SOS",
];
const key = (userId: string) => `travel-os:last-view:${userId}`;

export interface LastView {
  tripId: string;
  screen: string;
}
export function readLastView(userId: string): LastView | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) ?? "null");
    return raw && typeof raw.tripId === "string"
      ? {
          tripId: raw.tripId,
          screen: RESTORABLE_SCREENS.includes(raw.screen) ? raw.screen : "Hoje",
        }
      : null;
  } catch {
    return null;
  }
}
export function writeLastView(userId: string, view: LastView | null) {
  try {
    if (view) localStorage.setItem(key(userId), JSON.stringify(view));
    else localStorage.removeItem(key(userId));
  } catch {
    /* storage unavailable: just do not remember */
  }
}
