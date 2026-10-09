import "fake-indexeddb/auto";
import { it, expect, vi, afterEach } from "vitest";
import { photoDate, photos } from "../src/data/media";
import { put } from "../src/data/database";
import {
  validDocument,
  validReservation,
} from "../src/components/LocalEditors";
import handler from "../api/places";
import { weatherForecast } from "../src/adapters/external";
afterEach(() => vi.unstubAllGlobals());
it("reserva exige os campos obrigatórios e tipo personalizado", () => {
  const r = {
    title: "Ferry",
    category: "other",
    customType: "Ferry",
    date: "2026-10-05",
    time: "13:00",
    address: "Porto",
  };
  expect(validReservation(r)).toBe(true);
  for (const key of ["title", "customType", "date", "time", "address"])
    expect(validReservation({ ...r, [key]: "" })).toBe(false);
  expect(validReservation({ ...r, time: "24:01" })).toBe(false);
});
it("documento exige anexo e permite campos opcionais vazios", () => {
  const d = { title: "Identidade", category: "identity", hasAttachment: true };
  expect(validDocument(d)).toBe(true);
  expect(validDocument({ ...d, hasAttachment: false })).toBe(false);
  expect(validDocument({ ...d, category: "other" })).toBe(false);
  expect(
    validDocument({ ...d, category: "other", customType: "Vacinação" }),
  ).toBe(true);
});
it("lê DateTimeOriginal do TIFF e rejeita datas/imagens malformadas", () => {
  const b = new ArrayBuffer(80),
    v = new DataView(b);
  v.setUint16(0, 0xffd8);
  v.setUint16(2, 0xffe1);
  v.setUint16(4, 76);
  v.setUint32(6, 0x45786966);
  v.setUint16(12, 0x4949);
  v.setUint16(14, 42, true);
  v.setUint32(16, 8, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 0x8769, true);
  v.setUint16(24, 4, true);
  v.setUint32(26, 1, true);
  v.setUint32(30, 26, true);
  v.setUint16(38, 1, true);
  v.setUint16(40, 0x9003, true);
  v.setUint16(42, 2, true);
  v.setUint32(44, 20, true);
  v.setUint32(48, 44, true);
  for (const [i, c] of Array.from("2026:10:05 13:24:00").entries())
    v.setUint8(56 + i, c.charCodeAt(0));
  expect(photoDate(b)).toEqual({ date: "2026-10-05", time: "13:24" });
  v.setUint8(56 + 6, "9".charCodeAt(0));
  expect(photoDate(b)).toBe(null);
  expect(photoDate(new ArrayBuffer(2))).toBe(null);
});
it("galeria mantém blobs e isola viagens/tipos e exclusões", async () => {
  const base = {
    ownerId: "user",
    type: "album" as const,
    blob: new Blob(["full"]),
    thumbnail: new Blob(["thumb"]),
    name: "photo.jpg",
    date: "2026-10-05",
    location: "",
    caption: "",
    createdAt: "",
  };
  await put("media", { ...base, id: "media-one", tripId: "media-trip" });
  await put("media", { ...base, id: "media-two", tripId: "other-trip" });
  await put("media", {
    ...base,
    id: "media-three",
    tripId: "media-trip",
    deleted: true,
  });
  await put("media", {
    ...base,
    id: "media-cover",
    tripId: "media-trip",
    type: "cover",
  });
  const list = await photos("media-trip");
  expect(list.map((p) => p.id)).toEqual(["media-one"]);
  expect(list[0].blob).toBeInstanceOf(Blob);
});
it("endpoint Places sem segredo retorna estado de configuração sem chamar provider", async () => {
  const old = process.env.GEOAPIFY_API_KEY;
  delete process.env.GEOAPIFY_API_KEY;
  const status = vi.fn(),
    json = vi.fn(),
    res = {
      status: (n: number) => {
        status(n);
        return res;
      },
      json,
      setHeader: vi.fn(),
    };
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  try {
    await handler(
      { method: "GET", query: { q: "Los Angeles" }, headers: {} },
      res,
    );
    expect(status).toHaveBeenCalledWith(503);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    if (old) process.env.GEOAPIFY_API_KEY = old;
  }
});
it("previsão real validada é guardada e reutilizada sem conexão", async () => {
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          current: { temperature_2m: 24 },
          daily: {
            time: ["2026-10-05"],
            temperature_2m_min: [18],
            temperature_2m_max: [26],
            precipitation_probability_max: [10],
            sunset: ["2026-10-05T18:00"],
          },
        }),
      }),
  );
  const result = await weatherForecast(1, 2);
  expect(result.days[0].sunset).toBe("18:00");
  vi.stubGlobal("navigator", { onLine: false });
  expect((await weatherForecast(1, 2)).temperature).toBe(24);
  await expect(weatherForecast(3, 4)).rejects.toThrow("Previsão indisponível");
});
