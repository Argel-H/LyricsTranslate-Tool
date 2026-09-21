import { useRef } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGE_LABELS, type LanguageCode } from "@/lib/config/constants";
import { exportDatabase } from "@/lib/dbBackup";
import { useDatabaseImport } from "@/hooks/useDatabaseImport";
import { Globe, Trash2, Download, Upload, RefreshCw } from "lucide-react";

interface GeneralTabProps {
  onResetRequest: () => void;
}

export function GeneralTab({ onResetRequest }: GeneralTabProps) {
  const { t } = useI18n();
  const language = useSettingsStore((s) => s.language);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    importState,
    pendingCount,
    importedCount,
    errorMessage,
    countdown,
    selectFile,
    confirmImport,
    reset,
  } = useDatabaseImport({
    onComplete: () => {
      window.location.href = "/";
    },
  });

  const handleExport = async () => {
    try {
      await exportDatabase();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleImportClick = () => {
    reset();
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
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

      <div className="border-t border-outline-variant/20 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="size-5 text-primary" />
          <div>
            <p className="font-label-lg text-on-surface">{t("settings.dataManagement")}</p>
            <p className="font-body-md text-on-surface-variant mt-1">{t("settings.dataDesc")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={handleExport}
            className="px-5 py-2.5 rounded-full font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2"
          >
            <Download className="size-4" />
            {t("settings.exportButton")}
          </button>
          <button
            onClick={handleImportClick}
            className="px-5 py-2.5 rounded-full font-label-lg bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 transition-all flex items-center gap-2"
          >
            <Upload className="size-4" />
            {t("settings.importButton")}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={selectFile}
          className="hidden"
          aria-hidden
        />

        {importState === "confirming" && (
          <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30">
            <p className="font-body-md text-on-surface mb-4">
              {t("settings.importConfirm").replace("%d", String(pendingCount))}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmImport}
                className="px-5 py-2.5 rounded-full font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all"
              >
                {t("settings.importReplace")}
              </button>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {importState === "importing" && (
          <p className="font-body-md text-on-surface-variant">{t("settings.importing")}</p>
        )}

        {importState === "success" && (
          <div className="bg-primary-container/20 rounded-2xl p-4 border border-primary/20">
            <p className="font-body-md text-on-surface mb-3">
              {t("settings.importSuccess").replace("%d", String(importedCount))}
            </p>
            <p className="font-body-sm text-on-surface-variant mb-3">
              {t("settings.importRefreshingIn").replace("%.1f", countdown.toFixed(1))}
            </p>
            <button
              onClick={() => { window.location.href = "/"; }}
              className="px-5 py-2.5 rounded-full font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2"
            >
              <RefreshCw className="size-4" />
              {t("settings.importRefreshNow")}
            </button>
          </div>
        )}

        {importState === "error" && (
          <div className="bg-error-container/20 rounded-2xl p-4 border border-error/20">
            <p className="font-body-md text-error">{errorMessage}</p>
            <button
              onClick={reset}
              className="mt-2 px-4 py-1.5 rounded-full font-label-md text-error hover:bg-error-container/40 transition-all"
            >
              {t("common.ok")}
            </button>
          </div>
        )}
      </div>

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
