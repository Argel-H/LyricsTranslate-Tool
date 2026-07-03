import { create } from "zustand";
import { getPreferences, saveLanguage } from "@/db/settingsRepository";

interface SettingsState {
  language: "en" | "es" | "pt";
  setLanguage: (lang: "en" | "es" | "pt") => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: "en",
  setLanguage: async (lang) => {
    await saveLanguage(lang);
    set({ language: lang });
  },
  loadSettings: async () => {
    const prefs = await getPreferences();
    set({ language: prefs.language });
  },
}));
