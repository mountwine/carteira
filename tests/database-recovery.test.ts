import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { database } from "../src/data/database";

describe("IndexedDB recovery", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shares a concurrent open and retries after a transient failure", async () => {
    const seed = indexedDB.open("travel-os-v1", 2);
    seed.onupgradeneeded = () => {
      for (const store of [
        "records",
        "cache",
        "pending",
        "files",
        "receipts",
        "history",
        "accounts",
        "media",
        "settings",
      ])
        seed.result.createObjectStore(store, { keyPath: "id" });
    };
    const seeded = await new Promise<IDBDatabase>((resolve, reject) => {
      seed.onsuccess = () => resolve(seed.result);
      seed.onerror = () => reject(seed.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = seeded.transaction("records", "readwrite");
      transaction.objectStore("records").put({ id: "keep-this-record" });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    seeded.close();

    const open = vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
      throw new Error("transient open failure");
    });
    const failedA = database();
    const failedB = database();
    expect(failedB).toBe(failedA);
    const failures = await Promise.allSettled([failedA, failedB]);
    expect(failures.every((result) => result.status === "rejected")).toBe(true);

    const recoveredA = database();
    const recoveredB = database();
    expect(recoveredB).toBe(recoveredA);
    const [first, second] = await Promise.all([recoveredA, recoveredB]);
    expect(first).toBe(second);
    expect(open).toHaveBeenCalledTimes(2);
    expect(first.objectStoreNames.contains("records")).toBe(true);
    const preserved = await new Promise((resolve, reject) => {
      const request = first
        .transaction("records")
        .objectStore("records")
        .get("keep-this-record");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(preserved).toEqual({ id: "keep-this-record" });
    first.close();
  });
});
