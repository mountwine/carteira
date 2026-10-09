import type { PlaceSuggestion } from "../../src/domain/models";

const endpoint = "https://api.geoapify.com/v1/geocode/autocomplete";
const resultLimit = 8;
const osmAttribution = "© OpenStreetMap contributors";
const queryAliases: Record<string, string> = {
  LAX: "Los Angeles International Airport",
};

export function normalizeGeoapifyQuery(query: string) {
  const trimmed = query.trim();
  return queryAliases[trimmed.toUpperCase()] ?? trimmed;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function coordinate(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

export function normalizeGeoapifyResponse(payload: unknown): PlaceSuggestion[] {
  const results = object(payload);
  if (results?.type !== "FeatureCollection" || !Array.isArray(results.features))
    throw new Error("Resposta do Geoapify inválida");

  return results.features.slice(0, resultLimit).flatMap((feature: unknown) => {
    const properties = object(object(feature)?.properties);
    if (!properties) throw new Error("Resultado do Geoapify inválido");

    const addressLine = [text(properties.address_line1), text(properties.address_line2)]
      .filter((part): part is string => !!part)
      .join(", ");
    const address = text(properties.formatted) ?? addressLine ?? text(properties.name);
    const name = text(properties.name) ?? text(properties.address_line1) ?? address;
    if (!name || !address) throw new Error("Resultado do Geoapify incompleto");

    const geometry = object(object(feature)?.geometry);
    const geometryCoordinates = Array.isArray(geometry?.coordinates)
      ? geometry.coordinates
      : undefined;
    const lat = coordinate(properties.lat, -90, 90) ??
      coordinate(geometryCoordinates?.[1], -90, 90);
    const lng = coordinate(properties.lon, -180, 180) ??
      coordinate(geometryCoordinates?.[0], -180, 180);
    const categories = Array.isArray(properties.categories)
      ? properties.categories.map(text).filter((part): part is string => !!part)
      : [];
    const datasource = object(properties.datasource);
    const providerId = text(properties.place_id) ?? text(object(feature)?.id);
    const category = text(properties.category) ?? categories.at(-1);
    const city = text(properties.city) ?? text(properties.town) ??
      text(properties.village) ?? text(properties.municipality) ??
      text(properties.locality) ?? text(properties.suburb);

    return [{
      name,
      address,
      ...(city ? { city } : {}),
      ...(text(properties.state) ?? text(properties.county)
        ? { region: text(properties.state) ?? text(properties.county) }
        : {}),
      ...(text(properties.country) ? { country: text(properties.country) } : {}),
      ...(text(properties.postcode) ? { postalCode: text(properties.postcode) } : {}),
      ...(category ? { category } : {}),
      ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
      ...(providerId ? { providerId } : {}),
      provider: "geoapify" as const,
      attribution: text(datasource?.attribution) ?? osmAttribution,
    }];
  });
}

export async function searchGeoapify(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const url = new URL(endpoint);
  url.searchParams.set("text", normalizeGeoapifyQuery(query));
  url.searchParams.set("lang", "pt");
  url.searchParams.set("limit", String(resultLimit));
  url.searchParams.set("format", "geojson");
  url.searchParams.set("apiKey", apiKey);
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const error = new Error("Geoapify indisponível") as Error & { status?: number; retryAfter?: string };
    error.status = response.status;
    error.retryAfter = response.headers.get("Retry-After") ?? undefined;
    throw error;
  }
  return normalizeGeoapifyResponse(await response.json());
}
