import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { put } from "../src/data/database";
import { subscribeToPhotos, type Photo } from "../src/data/media";

function photo(id: string, tripId = "trip-a"): Photo {
  return {
    id,
    tripId,
    ownerId: "user-a",
    type: "album",
    blob: new Blob(),
    thumbnail: new Blob(),
    name: `${id}.jpg`,
    date: "2026-10-06",
    location: "",
    caption: "",
    createdAt: new Date().toISOString(),
  };
}

describe("Home photo summary refresh", () => {
  it("reloads the selected trip after media events and ignores updates after unsubscribe", async () => {
    const events = new EventTarget();
    const update = vi.fn();
    const unsubscribe = subscribeToPhotos("trip-a", update, events);
    await vi.waitFor(() => expect(update).toHaveBeenLastCalledWith([]));

    await put("media", photo("photo-a"));
    await put("media", photo("photo-other", "trip-b"));
    events.dispatchEvent(new Event("travel-os-media"));
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.lastCall?.[0].map((item: Photo) => item.id)).toEqual([
      "photo-a",
    ]);

    const callsBeforeUnsubscribe = update.mock.calls.length;
    unsubscribe();
    await put("media", photo("photo-b"));
    events.dispatchEvent(new Event("travel-os-media"));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(update).toHaveBeenCalledTimes(callsBeforeUnsubscribe);
  });
});
