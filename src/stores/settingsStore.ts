import { create } from "zustand";
import type { LanguageCode } from "@/lib/config/constants";
import type { AIProvider } from "@/lib/config/aiConfig";
import { getPreferences, saveLanguage, saveAiKey, removeAiKey, saveAiProvider, saveOverwriteTranslations } from "@/db/settingsRepository";

interface SettingsState {
  language: LanguageCode;
  aiProvider: AIProvider;
  apiKeys: Record<string, string>;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  setAiProvider: (provider: AIProvider) => void;
  saveApiKey: (provider: AIProvider, apiKey: string) => Promise<void>;
  deleteApiKey: (provider: AIProvider) => Promise<void>;
  loadSettings: () => Promise<void>;
  overwriteTranslations: boolean;
  setOverwriteTranslations: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: "en",
  aiProvider: null,
  apiKeys: {},
  overwriteTranslations: false,
  setLanguage: async (lang) => {
    await saveLanguage(lang);
    set({ language: lang });
  },
  setAiProvider: async (provider) => {
    await saveAiProvider(provider);
    set({ aiProvider: provider });
  },
  saveApiKey: async (provider, apiKey) => {
    if (!provider) return;
    await saveAiKey(provider, apiKey);
    set({ apiKeys: { ...get().apiKeys, [provider]: apiKey } });
  },
  deleteApiKey: async (provider) => {
    if (!provider) return;
    await removeAiKey(provider);
    const keys = { ...get().apiKeys };
    delete keys[provider];
    set({ apiKeys: keys });
  },
  setOverwriteTranslations: async (enabled) => {
    await saveOverwriteTranslations(enabled);
    set({ overwriteTranslations: enabled });
  },
  loadSettings: async () => {
    const prefs = await getPreferences();
    set({
      language: prefs.language,
      apiKeys: prefs.apiKeys ?? {},
      aiProvider: (prefs.aiProvider as AIProvider) ?? null,
      overwriteTranslations: prefs.overwriteTranslations ?? false,
    });
  },
}));
