import { create } from "zustand";
import type { LanguageCode } from "@/lib/constants";
import type { AIProvider } from "@/lib/aiConfig";
import { getPreferences, saveLanguage, saveAiKey, removeAiKey, saveAiProvider } from "@/db/settingsRepository";

interface SettingsState {
  language: LanguageCode;
  aiProvider: AIProvider;
  apiKeys: Record<string, string>;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  setAiProvider: (provider: AIProvider) => void;
  saveApiKey: (provider: AIProvider, apiKey: string) => Promise<void>;
  deleteApiKey: (provider: AIProvider) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: "en",
  aiProvider: null,
  apiKeys: {},
  setLanguage: async (lang) => {
    await saveLanguage(lang);
    set({ language: lang });
  },
  setAiProvider: async (provider) => {
    await saveAiProvider(provider);
    set({ aiProvider: provider });
  },
  saveApiKey: async (provider, apiKey) => {
    await saveAiKey(provider, apiKey);
    set({ apiKeys: { ...get().apiKeys, [provider]: apiKey } });
  },
  deleteApiKey: async (provider) => {
    await removeAiKey(provider);
    const keys = { ...get().apiKeys };
    delete keys[provider];
    set({ apiKeys: keys });
  },
  loadSettings: async () => {
    const prefs = await getPreferences();
    set({
      language: prefs.language,
      apiKeys: prefs.apiKeys ?? {},
      aiProvider: (prefs.aiProvider as AIProvider) ?? null,
    });
  },
}));
