import { db, type UserPreferences } from "./database";

const SINGLETON_ID: "singleton" = "singleton";

export async function getPreferences(): Promise<UserPreferences> {
  const prefs = await db.preferences.get(SINGLETON_ID);
  if (prefs) return prefs;
  const defaults: UserPreferences = { id: SINGLETON_ID, language: "en" };
  await db.preferences.put(defaults);
  return defaults;
}

export async function saveLanguage(language: "en" | "es" | "pt"): Promise<void> {
  await db.preferences.put({ id: SINGLETON_ID, language });
}
