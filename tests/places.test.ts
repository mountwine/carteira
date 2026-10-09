import { afterEach, describe, expect, it, vi } from "vitest";
import { handlePlaces } from "../api/places";
import { normalizeGeoapifyQuery, normalizeGeoapifyResponse } from "../api/providers/geoapify";
import { createPlacesRequestGate, searchPlaces } from "../src/adapters/external";

const env = {
  GEOAPIFY_API_KEY: "mock-provider-key",
  ALLOWED_ORIGIN: "https://app.example",
};
const requestHeaders = { origin: "https://app.example" };

function response() {
  let body: unknown;
  const headers: Record<string, string> = {};
  return {
    headers,
    get body() { return body; },
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
    json(value: unknown) { body = value; },
  };
}

function geoapifyResult(overrides: Record<string, unknown> = {}) {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {
        name: "Griffith Observatory",
        formatted: "Griffith Observatory, 2800 E Observatory Rd, Los Angeles, CA 90027, United States",
        city: "Los Angeles",
        state: "California",
        country: "United States",
        postcode: "90027",
        lat: 34.1184,
        lon: -118.3004,
        categories: ["tourism", "tourism.attraction"],
        place_id: "geoapify-place-1",
        datasource: { attribution: "© OpenStreetMap contributors" },
        ...overrides,
      },
      geometry: { type: "Point", coordinates: [-118.3004, 34.1184] },
    }],
  };
}

describe("provider-neutral Places endpoint backed by Geoapify", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a safe configuration error when the key is missing", async () => {
    const res = response();
    await handlePlaces({ method: "GET", query: { q: "LAX" }, headers: {} }, res, {});
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "Pesquisa não configurada" });
  });

  it("requires the exact allowed origin even with a provider key", async () => {
    const res = response();
    await handlePlaces(
      { method: "GET", query: { q: "LAX" }, headers: requestHeaders },
      res,
      { GEOAPIFY_API_KEY: env.GEOAPIFY_API_KEY },
    );
    expect(res.statusCode).toBe(503);
  });

  it("calls Geoapify server-side and transforms the response to the internal contract", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://api.geoapify.com");
      expect(url.pathname).toBe("/v1/geocode/autocomplete");
      expect(url.searchParams.get("text")).toBe("Griffith Observatory");
      expect(url.searchParams.get("format")).toBe("geojson");
      expect(url.searchParams.get("lang")).toBe("pt");
      expect(url.searchParams.get("limit")).toBe("8");
      expect(url.searchParams.get("apiKey")).toBe("mock-provider-key");
      return Response.json(geoapifyResult());
    });
    vi.stubGlobal("fetch", fetch);
    const res = response();
    await handlePlaces({
      method: "GET",
      query: { q: "Griffith Observatory" },
      headers: { ...requestHeaders, "x-forwarded-for": "geoapify-success-test" },
    }, res, env);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ places: [{
      name: "Griffith Observatory",
      address: "Griffith Observatory, 2800 E Observatory Rd, Los Angeles, CA 90027, United States",
      city: "Los Angeles",
      region: "California",
      country: "United States",
      postalCode: "90027",
      category: "tourism.attraction",
      lat: 34.1184,
      lng: -118.3004,
      providerId: "geoapify-place-1",
      provider: "geoapify",
      attribution: "© OpenStreetMap contributors",
    }] });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("returns an empty list for an empty FeatureCollection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ type: "FeatureCollection", features: [] })));
    const res = response();
    await handlePlaces({ method: "GET", query: { q: "unknown place" }, headers: requestHeaders }, res, env);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ places: [] });
  });

  it("returns a safe provider error for malformed GeoJSON from the live API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ type: "FeatureCollection", features: [{ type: "Feature", properties: {} }] })));
    const res = response();
    await handlePlaces({ method: "GET", query: { q: "Hotel Central" }, headers: requestHeaders }, res, env);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "Pesquisa indisponível" });
  });

  it("returns a safe provider error when Geoapify is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network failure"); }));
    const res = response();
    await handlePlaces({ method: "GET", query: { q: "Hotel Central" }, headers: requestHeaders }, res, env);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "Pesquisa indisponível" });
  });

  it("rejects invalid GeoJSON and incomplete features", () => {
    expect(() => normalizeGeoapifyResponse({ results: [] })).toThrow("inválida");
    expect(() => normalizeGeoapifyResponse({ type: "FeatureCollection", features: [{ type: "Feature", properties: {} }] })).toThrow("incompleto");
  });

  it("expands the requested LAX airport code to its canonical place name", () => {
    expect(normalizeGeoapifyQuery("LAX")).toBe("Los Angeles International Airport");
    expect(normalizeGeoapifyQuery(" Griffith Observatory ")).toBe("Griffith Observatory");
  });

  it("maps upstream errors to safe errors and preserves the provider retry delay", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("quota", { status: 429, headers: { "Retry-After": "30" } })));
    const res = response();
    await handlePlaces({ method: "GET", query: { q: "LAX" }, headers: requestHeaders }, res, env);
    expect(res.statusCode).toBe(429);
    expect(res.headers["retry-after"]).toBe("30");
    expect(res.body).toEqual({ error: "Limite de pesquisa atingido" });
  });

  it("rejects a foreign origin and malformed/short queries without contacting Geoapify", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const foreign = response();
    await handlePlaces({ method: "GET", query: { q: "LAX" }, headers: { origin: "https://evil.example" } }, foreign, env);
    expect(foreign.statusCode).toBe(403);
    const short = response();
    await handlePlaces({ method: "GET", query: { q: "LA" }, headers: requestHeaders }, short, env);
    expect(short.statusCode).toBe(400);
    const arrayQuery = response();
    await handlePlaces({ method: "GET", query: { q: ["LAX"] }, headers: requestHeaders }, arrayQuery, env);
    expect(arrayQuery.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not make a request for a short query and reports offline/manual fallback", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(searchPlaces("LA")).resolves.toEqual([]);
    const originalOnline = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await expect(searchPlaces("LAX")).rejects.toThrow("local manualmente");
    Object.defineProperty(navigator, "onLine", originalOnline ?? { configurable: true, value: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("normalizes the internal adapter response and retains Geoapify fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ places: normalizeGeoapifyResponse(geoapifyResult()) })));
    await expect(searchPlaces("Griffith Observatory")).resolves.toMatchObject([{
      name: "Griffith Observatory",
      address: expect.stringContaining("Los Angeles"),
      city: "Los Angeles",
      region: "California",
      country: "United States",
      postalCode: "90027",
      category: "tourism.attraction",
      lat: 34.1184,
      lng: -118.3004,
      providerId: "geoapify-place-1",
      provider: "geoapify",
      attribution: "© OpenStreetMap contributors",
    }]);
  });

  it("does not allow an older query response to become current after newer typing", () => {
    const requests = createPlacesRequestGate();
    const first = requests.next();
    const second = requests.next();
    expect(requests.isCurrent(first)).toBe(false);
    expect(requests.isCurrent(second)).toBe(true);
    requests.cancel(second);
    expect(requests.isCurrent(second)).toBe(false);
  });
});
