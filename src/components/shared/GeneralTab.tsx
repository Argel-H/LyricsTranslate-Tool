import { useI18n } from "@/hooks/useI18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGE_LABELS, type LanguageCode } from "@/lib/constants";
import { Globe, Trash2 } from "lucide-react";

interface GeneralTabProps {
  onResetRequest: () => void;
}

export function GeneralTab({ onResetRequest }: GeneralTabProps) {
  const { t } = useI18n();
  const language = useSettingsStore((s) => s.language);

  return (
    <div className="space-y-6">
      {/* Language */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Globe className="size-5 text-primary" />
          <div>
            <p className="font-label-lg text-on-surface">{t("settings.language")}</p>
            <p className="font-body-md text-on-surface-variant mt-1">{t("settings.languageDescription")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {(Object.entries(LANGUAGE_LABELS) as [LanguageCode, string][]).map(([code, label]) => (
            <button
              key={code}
              onClick={() => useSettingsStore.getState().setLanguage(code)}
              className={`px-6 py-3 rounded-full font-label-lg transition-all duration-200 border ${
                language === code
                  ? "bg-primary-container !text-on-primary-container border-primary shadow-md"
                  : "bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="border-t border-outline-variant/20 pt-6">
        <div className="flex items-center gap-3 mb-3">
          <Trash2 className="size-5 text-error" />
          <div>
            <p className="font-label-lg text-on-surface">{t("settings.resetDatabase")}</p>
            <p className="font-body-md text-on-surface-variant mt-1">{t("settings.resetDesc")}</p>
          </div>
        </div>
        <button
          onClick={onResetRequest}
          className="px-5 py-2.5 rounded-full font-label-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all"
        >
          {t("settings.resetAll")}
        </button>
      </div>
    </div>
  );
}
