import { db, type UserPreferences } from "./database";
import type { LanguageCode } from "@/lib/config/constants";
import type { AIProvider } from "@/lib/config/aiConfig";

const SINGLETON_ID = "singleton" as const;

export async function getPreferences(): Promise<UserPreferences> {
  const prefs = await db.preferences.get(SINGLETON_ID);
  if (prefs) return prefs;
  const defaults: UserPreferences = { id: SINGLETON_ID, language: "en", apiKeys: {} };
  await db.preferences.put(defaults);
  return defaults;
}

export async function saveLanguage(language: LanguageCode): Promise<void> {
  const prefs = await getPreferences();
  await db.preferences.put({ ...prefs, language });
}

export async function saveAiProvider(provider: AIProvider): Promise<void> {
  const prefs = await getPreferences();
  await db.preferences.put({ ...prefs, aiProvider: provider });
}

export async function saveAiKey(provider: NonNullable<AIProvider>, apiKey: string): Promise<void> {
  const prefs = await getPreferences();
  const apiKeys = { ...prefs.apiKeys, [provider]: apiKey };
  await db.preferences.put({ ...prefs, apiKeys });
}

export async function removeAiKey(provider: NonNullable<AIProvider>): Promise<void> {
  const prefs = await getPreferences();
  const apiKeys = { ...prefs.apiKeys };
  delete apiKeys[provider];
  await db.preferences.put({ ...prefs, apiKeys });
}

export async function saveOverwriteTranslations(enabled: boolean): Promise<void> {
  const prefs = await getPreferences();
  await db.preferences.put({ ...prefs, overwriteTranslations: enabled });
}
