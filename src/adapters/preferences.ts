import { backendClient, isDemo } from "./index";
import type { Profile } from "../domain/entities";
export async function loadPreferences(
  userId: string,
): Promise<Partial<Profile>> {
  const key = `travel-os:preferences:${userId}`;
  if (isDemo || !navigator.onLine)
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  const { data, error } = await backendClient!
    .from("users")
    .select("preferences")
    .eq("id", userId)
    .single();
  if (error) throw error;
  const prefs = data?.preferences ?? {};
  localStorage.setItem(key, JSON.stringify(prefs));
  return prefs;
}
export function cachePreferences(userId: string, profile: Profile) {
  const { tripPreferences, ...permanent } = profile;
  localStorage.setItem(
    `travel-os:preferences:${userId}`,
    JSON.stringify(permanent),
  );
}
export function currentPreferences(userId: string): Partial<Profile> {
  try {
    return JSON.parse(
      localStorage.getItem(`travel-os:preferences:${userId}`) ?? "{}",
    );
  } catch {
    return {};
  }
}
