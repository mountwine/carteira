import type { PlaceData } from "../domain/models";
import { get, put } from "../data/database";
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  sessionToken?: string,
): Promise<PlaceData[]> {
  if (!navigator.onLine)
    throw new Error("Sem conexão. Você pode informar o local manualmente.");
  const endpoint = import.meta.env.VITE_PLACES_ENDPOINT || "/api/places";
  const res = await fetch(
    `${endpoint}?q=${encodeURIComponent(query)}&session=${encodeURIComponent(sessionToken ?? "")}`,
    { signal },
  );
  if (!res.ok)
    throw new Error(
      res.status === 503
        ? "Pesquisa online não configurada. Informe o local manualmente."
        : "Pesquisa indisponível. Informe o local manualmente.",
    );
  if (!res.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "Pesquisa online não configurada. Informe o local manualmente.",
    );
  const data = await res.json();
  if (!Array.isArray(data.places)) throw new Error("Pesquisa indisponível.");
  return data.places;
}
export async function placeDetails(
  place: PlaceData,
  session: string,
): Promise<PlaceData> {
  if (!place.providerId) return place;
  const endpoint = import.meta.env.VITE_PLACES_ENDPOINT || "/api/places";
  const res = await fetch(
    `${endpoint}?id=${encodeURIComponent(place.providerId)}&session=${encodeURIComponent(session)}`,
  );
  if (!res.ok)
    throw new Error(
      "Não foi possível carregar o endereço. Selecione novamente ou informe manualmente.",
    );
  return res.json();
}
export interface FxQuote {
  id: string;
  base: string;
  quote: string;
  rate: number;
  date: string;
  fetchedAt: string;
  cached?: boolean;
}
export async function currentRate(
  base: string,
  quote: string,
): Promise<FxQuote> {
  if (base === quote)
    return {
      id: `fx:${base}:${quote}`,
      base,
      quote,
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      fetchedAt: new Date().toISOString(),
    };
  const id = `fx:${base}:${quote}`,
    cache = await get<FxQuote>("settings", id);
  try {
    if (!navigator.onLine) throw new Error("Offline");
    const res = await fetch(
      `https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) throw new Error("Cotação indisponível");
    const d = await res.json();
    if (!Number.isFinite(d.rate) || d.rate <= 0 || !d.date)
      throw new Error("Cotação inválida");
    const value: FxQuote = {
      id,
      base,
      quote,
      rate: d.rate,
      date: d.date,
      fetchedAt: new Date().toISOString(),
    };
    await put("settings", value);
    await put("settings", {
      id: `fx:${quote}:${base}`,
      base: quote,
      quote: base,
      rate: 1 / d.rate,
      date: d.date,
      fetchedAt: value.fetchedAt,
    });
    return value;
  } catch {
    if (cache) return { ...cache, cached: true };
    throw new Error(
      "Cotação indisponível. Conecte-se para atualizar ou informe a taxa no gasto.",
    );
  }
}

export interface WeatherDay {
  date: string;
  min: number;
  max: number;
  rain: number;
  sunset: string;
}
export interface WeatherForecast {
  id: string;
  temperature: number;
  days: WeatherDay[];
  at: string;
  cached?: boolean;
}
export async function weatherForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<WeatherForecast> {
  const id = `weather:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  const cache = await get<WeatherForecast>("settings", id);
  if (cache && Date.now() - Date.parse(cache.at) < 30 * 60 * 1000)
    return { ...cache, cached: !navigator.onLine };
  try {
    if (!navigator.onLine) throw new Error("Offline");
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&timezone=auto&forecast_days=7`,
      { signal: signal ?? AbortSignal.timeout(10000) },
    );
    if (!response.ok) throw new Error("Previsão indisponível");
    const data = await response.json();
    if (
      !Number.isFinite(data.current?.temperature_2m) ||
      !Array.isArray(data.daily?.time)
    )
      throw new Error("Previsão indisponível");
    const result: WeatherForecast = {
      id,
      temperature: data.current.temperature_2m,
      at: new Date().toISOString(),
      days: data.daily.time.map((date: string, i: number) => ({
        date,
        min: data.daily.temperature_2m_min[i],
        max: data.daily.temperature_2m_max[i],
        rain: data.daily.precipitation_probability_max[i],
        sunset: data.daily.sunset[i]?.slice(11, 16) ?? "—",
      })),
    };
    if (result.days.some((d) => ![d.min, d.max, d.rain].every(Number.isFinite)))
      throw new Error("Previsão indisponível");
    await put("settings", result);
    return result;
  } catch (e) {
    if (signal?.aborted) throw e;
    if (cache) return { ...cache, cached: true };
    throw new Error("Previsão indisponível no momento.");
  }
}
