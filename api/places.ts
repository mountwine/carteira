// Provider-neutral server endpoint. Provider credentials and trip data stay server-side.
import { searchGeoapify } from "./providers/geoapify";

declare const process: { env: Record<string, string | undefined> };

interface Incoming {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}
interface Outgoing {
  status(n: number): Outgoing;
  json(v: unknown): void;
  setHeader(k: string, v: string): void;
}
export interface PlacesEnvironment {
  GEOAPIFY_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
}

const windows = new Map<string, { at: number; count: number }>();

function header(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.origin !== value ||
      parsed.username ||
      parsed.password
    ) return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}
function requestOrigin(req: Incoming): string | undefined {
  const origin = header(req.headers.origin);
  if (origin) return normalizeOrigin(origin);
  const referer = header(req.headers.referer);
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
function queryValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}
function errorStatus(error: unknown): number | undefined {
  return error !== null && typeof error === "object" &&
    "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
}
function retryAfter(error: unknown): string | undefined {
  return error !== null && typeof error === "object" &&
    "retryAfter" in error && typeof error.retryAfter === "string"
    ? error.retryAfter
    : undefined;
}

export default async function handler(req: Incoming, res: Outgoing) {
  return handlePlaces(req, res, process.env);
}

export async function handlePlaces(
  req: Incoming,
  res: Outgoing,
  env: PlacesEnvironment,
) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const apiKey = env.GEOAPIFY_API_KEY?.trim();
  const allowedOrigin = normalizeOrigin(env.ALLOWED_ORIGIN?.trim());
  if (!apiKey || !allowedOrigin) {
    res.status(503).json({ error: "Pesquisa não configurada" });
    return;
  }
  if (requestOrigin(req) !== allowedOrigin) {
    res.status(403).json({ error: "Origem não permitida" });
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");

  const ip = String(
    header(req.headers["x-forwarded-for"]) ??
      header(req.headers["x-real-ip"]) ??
      "unknown",
  ).split(",")[0].trim();
  let window = windows.get(ip);
  if (!window || Date.now() - window.at > 60000) {
    window = { at: Date.now(), count: 0 };
    windows.set(ip, window);
  }
  if (++window.count > 60) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Tente novamente em instantes" });
    return;
  }
  if (windows.size > 10000) {
    for (const [address, record] of windows)
      if (Date.now() - record.at > 60000) windows.delete(address);
  }

  const query = queryValue(req.query.q);
  if (!query || query.length < 3 || query.length > 200) {
    res.status(400).json({ error: "Pesquisa inválida" });
    return;
  }

  try {
    const places = await searchGeoapify(
      query,
      apiKey,
      AbortSignal.timeout(10000),
    );
    res.status(200).json({ places });
  } catch (error) {
    if (errorStatus(error) === 429) {
      res.setHeader("Retry-After", retryAfter(error) ?? "60");
      res.status(429).json({ error: "Limite de pesquisa atingido" });
      return;
    }
    res.status(502).json({ error: "Pesquisa indisponível" });
  }
}
