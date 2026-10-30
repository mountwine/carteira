import type { AnyEntity } from "../domain/entities";
import type { Trip } from "../domain/models";
import { all, get, put } from "./database";
import type { Photo } from "./media";
import type { MediaStore } from "./photoSync";
import type { Cursor, HistoryEntry, LocalStore, SyncMark } from "./cloudSync";

const tripsKey = "travel-os:trips:v1";
let channel: BroadcastChannel | null | undefined;

export const browserStore: LocalStore = {
  trips() {
    try {
      return JSON.parse(localStorage.getItem(tripsKey) ?? "[]") as Trip[];
    } catch {
      return [];
    }
  },
  saveTrips(trips) {
    localStorage.setItem(tripsKey, JSON.stringify(trips));
  },
  records: () => all<AnyEntity>("records"),
  putRecord: (record) => put("records", record),
  getMark: (id) => get<SyncMark | Cursor>("settings", id),
  putMark: (mark) => put("settings", mark),
  addHistory: (entry: HistoryEntry) => put("history", entry),
  announce(tripId) {
    if (channel === undefined)
      channel =
        typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel("travel-os-data")
          : null;
    channel?.postMessage(tripId);
  },
};

export const browserMedia: MediaStore = {
  list: () => all<Photo>("media"),
  put: (photo) => put("media", photo),
};
