import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trip } from "../src/domain/models";
import { mediaBlob, setPhotoLoader, type Photo } from "../src/data/media";
import { put } from "../src/data/database";
import {
  fullPath,
  syncPhotos,
  thumbPath,
  type MediaStore,
  type PhotoFiles,
} from "../src/data/photoSync";
import { createDevice, createServer } from "./helpers/cloudFake";
import { syncOnce } from "../src/data/cloudSync";

const leo = "u-leo",
  maya = "u-maya";
const trip = (): Trip => ({
  id: "trip-1",
  name: "Costa Oeste",
  cover: "",
  startDate: "2027-01-20",
  endDate: "2027-02-07",
  currency: "USD",
  pace: "balanced",
  isDemo: false,
  version: 1,
  destinations: [],
  members: [
    {
      userId: leo,
      displayName: "Leo",
      invitationState: "accepted",
      preferences: {},
    },
  ],
});
const photo = (id: string, extra: Partial<Photo> = {}): Photo => ({
  id,
  tripId: "trip-1",
  ownerId: leo,
  type: "album",
  blob: new Blob([`grande-${id}`]),
  thumbnail: new Blob([`mini-${id}`]),
  name: `${id}.jpg`,
  date: "2027-01-22",
  location: "",
  caption: "",
  createdAt: "2027-01-22T10:00:00Z",
  ...extra,
});

function memoryMedia() {
  const map = new Map<string, Photo>();
  const store: MediaStore & { map: Map<string, Photo> } = {
    map,
    list: async () => [...map.values()],
    put: async (p) => void map.set(p.id, p),
  };
  return store;
}
function memoryFiles(storage = new Map<string, Blob>()) {
  const files: PhotoFiles & { storage: Map<string, Blob>; offline: boolean } = {
    storage,
    offline: false,
    async upload(path, blob) {
      if (files.offline) throw new Error("offline");
      storage.set(path, blob);
    },
    async download(path) {
      if (files.offline) throw new Error("offline");
      const blob = storage.get(path);
      if (!blob) throw new Error("not found");
      return blob;
    },
    async remove(paths) {
      for (const p of paths) storage.delete(p);
    },
  };
  return files;
}
/** One device: its own record store, photo store and the shared server. */
function device() {
  return { base: createDevice(), media: memoryMedia() };
}
async function sync(
  who: string,
  server: ReturnType<typeof createServer>,
  d: ReturnType<typeof device>,
  files: ReturnType<typeof memoryFiles>,
) {
  await syncOnce(who, server.remote(who), d.base);
  return syncPhotos(who, server.remote(who), files, d.media, d.base);
}

describe("fotos entre aparelhos", () => {
  it("sobe os arquivos e os dados; o outro aparelho recebe os dados e a miniatura", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device(),
      b = device();
    a.base.tripList = [trip()];
    a.media.map.set("p1", photo("p1", { caption: "Pôr do sol" }));
    expect((await sync(leo, server, a, files)).uploaded).toBe(1);
    expect([...files.storage.keys()].sort()).toEqual(
      [
        fullPath({ tripId: "trip-1", id: "p1" }),
        thumbPath({ tripId: "trip-1", id: "p1" }),
      ].sort(),
    );
    expect(server.records.get("p1")?.kind).toBe("photo");

    await sync(leo, server, b, files);
    const got = b.media.map.get("p1")!;
    expect(got).toMatchObject({
      caption: "Pôr do sol",
      date: "2027-01-22",
      remote: "thumb",
      ownerId: leo,
    });
    expect(await got.thumbnail.text()).toBe("mini-p1");
  });

  it("não publica os dados enquanto os arquivos não subiram (sem internet)", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device();
    a.base.tripList = [trip()];
    a.media.map.set("p1", photo("p1"));
    files.offline = true;
    await sync(leo, server, a, files);
    expect(server.records.has("p1")).toBe(false);
    files.offline = false;
    await sync(leo, server, a, files);
    expect(server.records.has("p1")).toBe(true);
  });

  it("legenda editada em um aparelho chega ao outro", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device(),
      b = device();
    a.base.tripList = [trip()];
    a.media.map.set("p1", photo("p1"));
    await sync(leo, server, a, files);
    await sync(leo, server, b, files);
    const edited = {
      ...b.media.map.get("p1")!,
      caption: "Na praia",
      updatedAt: "2099-01-01T00:00:00Z",
    };
    b.media.map.set("p1", edited);
    await sync(leo, server, b, files);
    await sync(leo, server, a, files);
    expect(a.media.map.get("p1")?.caption).toBe("Na praia");
  });

  it("apagar a foto propaga e libera os arquivos do servidor", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device(),
      b = device();
    a.base.tripList = [trip()];
    a.media.map.set("p1", photo("p1"));
    await sync(leo, server, a, files);
    await sync(leo, server, b, files);
    a.media.map.set("p1", {
      ...a.media.map.get("p1")!,
      deleted: true,
      updatedAt: "2099-01-01T00:00:00Z",
    });
    await sync(leo, server, a, files);
    expect(files.storage.size).toBe(0);
    await sync(leo, server, b, files);
    expect(b.media.map.get("p1")?.deleted).toBe(true);
  });

  it("não apaga os arquivos antes de a exclusão chegar ao servidor", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device();
    a.base.tripList = [trip()];
    a.media.map.set("p1", photo("p1"));
    await sync(leo, server, a, files);
    a.media.map.set("p1", {
      ...a.media.map.get("p1")!,
      deleted: true,
      updatedAt: "2099-01-01T00:00:00Z",
    });
    server.members.get("trip-1")!.delete(leo);
    await expect(
      syncPhotos(leo, server.remote(leo), files, a.media, a.base),
    ).resolves.toBeDefined();
    expect(files.storage.size).toBe(2);
  });

  it("quem entrou pela viagem vê as fotos e envia as dele", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device(),
      g = device();
    a.base.tripList = [trip()];
    a.media.map.set("p1", photo("p1"));
    await sync(leo, server, a, files);
    server.join(maya, "trip-1");
    await sync(maya, server, g, files);
    expect(g.media.map.get("p1")?.remote).toBe("thumb");
    g.media.map.set("p2", photo("p2", { ownerId: maya }));
    await sync(maya, server, g, files);
    await sync(leo, server, a, files);
    expect(a.media.map.get("p2")).toMatchObject({
      ownerId: maya,
      remote: "thumb",
    });
  });

  it("não envia foto de viagem de outra conta nem foto de outra pessoa", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device();
    a.base.tripList = [trip()];
    a.media.map.set("alheia", photo("alheia", { tripId: "outra" }));
    a.media.map.set("de-outro", photo("de-outro", { ownerId: maya }));
    await sync(leo, server, a, files);
    expect(files.storage.size).toBe(0);
    expect(server.records.size).toBe(0);
  });

  it("não repete envio quando nada mudou", async () => {
    const server = createServer(),
      files = memoryFiles();
    const a = device();
    a.base.tripList = [trip()];
    a.media.map.set("p1", photo("p1"));
    await sync(leo, server, a, files);
    const upload = vi.spyOn(files, "upload");
    const again = await sync(leo, server, a, files);
    expect(upload).not.toHaveBeenCalled();
    expect(again).toEqual({ uploaded: 0, changed: 0 });
  });
});

describe("abrir a foto vinda de outro aparelho", () => {
  beforeEach(() => setPhotoLoader(null));
  const stored = (id: string, remote?: "stub" | "thumb") =>
    put(
      "media",
      photo(id, {
        remote,
        thumbnail: new Blob(["mini"]),
        blob: new Blob(["mini"]),
      }),
    );

  it("baixa a foto grande na primeira abertura e guarda", async () => {
    await stored("full-1", "thumb");
    const loader = vi.fn(async () => new Blob(["GRANDE"]));
    setPhotoLoader(loader);
    expect(await (await mediaBlob("full-1")).text()).toBe("GRANDE");
    expect(await (await mediaBlob("full-1")).text()).toBe("GRANDE");
    expect(loader).toHaveBeenCalledTimes(1);
  });
  it("sem internet mostra a miniatura em vez de falhar", async () => {
    await stored("full-2", "thumb");
    setPhotoLoader(async () => {
      throw new Error("offline");
    });
    expect(await (await mediaBlob("full-2")).text()).toBe("mini");
  });
  it("foto só com dados ainda não tem imagem para mostrar", async () => {
    await stored("full-3", "stub");
    await expect(mediaBlob("full-3", true)).rejects.toThrow(
      "ainda não baixada",
    );
  });
  it("a miniatura nunca dispara o download da foto grande", async () => {
    await stored("full-4", "thumb");
    const loader = vi.fn(async () => new Blob(["GRANDE"]));
    setPhotoLoader(loader);
    await mediaBlob("full-4", true);
    expect(loader).not.toHaveBeenCalled();
  });
});
