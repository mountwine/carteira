// Vercel Node function; secret stays on the server. No personal travel data is stored here.
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
const windows = new Map<string, { at: number; count: number }>();
export default async function handler(req: Incoming, res: Outgoing) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    res.status(503).json({ error: "Pesquisa não configurada" });
    return;
  }
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && req.headers.origin && req.headers.origin !== allowed) {
    res.status(403).json({ error: "Origem não permitida" });
    return;
  }
  const ip = String(req.headers["x-forwarded-for"] ?? "local").split(",")[0];
  let w = windows.get(ip);
  if (!w || Date.now() - w.at > 60000) {
    w = { at: Date.now(), count: 0 };
    windows.set(ip, w);
  }
  if (++w.count > 60) {
    res.status(429).json({ error: "Tente novamente em instantes" });
    return;
  }
  if (windows.size > 10000)
    for (const [k, v] of windows)
      if (Date.now() - v.at > 60000) windows.delete(k);
  const q = String(req.query.q ?? ""),
    id = String(req.query.id ?? ""),
    session = String(req.query.session ?? "");
  if (session && !/^[a-f\d-]{36}$/i.test(session)) {
    res.status(400).json({ error: "Sessão inválida" });
    return;
  }
  try {
    if (id) {
      if (!/^[\w-]{5,200}$/.test(id)) throw new Error("ID inválido");
      const url = new URL(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
      );
      if (session) url.searchParams.set("sessionToken", session);
      const response = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,addressComponents,location",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Provider indisponível");
      const d = await response.json();
      const component = (type: string) =>
        d.addressComponents?.find((c: { types: string[] }) =>
          c.types.includes(type),
        )?.longText ?? "";
      res.status(200).json({
        name: d.displayName?.text ?? d.formattedAddress,
        address: d.formattedAddress,
        city: component("locality"),
        region: component("administrative_area_level_1"),
        country: component("country"),
        lat: d.location?.latitude,
        lng: d.location?.longitude,
        providerId: d.id,
        provider: "google",
      });
      return;
    }
    if (q.trim().length < 3 || q.length > 200) {
      res.status(400).json({ error: "Pesquisa inválida" });
      return;
    }
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
        body: JSON.stringify({
          input: q,
          languageCode: "pt-BR",
          ...(session ? { sessionToken: session } : {}),
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error("Provider indisponível");
    const d = await response.json();
    res.status(200).json({
      places: (d.suggestions ?? [])
        .filter((s: { placePrediction?: unknown }) => s.placePrediction)
        .map(
          (s: {
            placePrediction: {
              placeId: string;
              text: { text: string };
              structuredFormat?: {
                mainText?: { text: string };
                secondaryText?: { text: string };
              };
            };
          }) => ({
            name:
              s.placePrediction.structuredFormat?.mainText?.text ??
              s.placePrediction.text.text,
            address:
              s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
            providerId: s.placePrediction.placeId,
            provider: "google",
          }),
        ),
    });
  } catch {
    res.status(502).json({ error: "Pesquisa indisponível" });
  }
}
