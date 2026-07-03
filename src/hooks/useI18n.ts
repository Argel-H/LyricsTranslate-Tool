import { useCallback } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { pt } from "@/i18n/pt";
import type { I18nKey } from "@/i18n";

const maps = { en, es, pt } as const;

export function useI18n() {
  const language = useSettingsStore((s) => s.language);

  const t = useCallback(
    (key: I18nKey): string => {
      return maps[language]?.[key] ?? en[key] ?? key;
    },
    [language],
  );

  return { t, language };
}
