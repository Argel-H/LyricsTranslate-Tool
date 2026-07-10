import { useRef, useState, useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGE_LABELS, type LanguageCode } from "@/lib/constants";
import { exportDatabase, importDatabase } from "@/lib/dbBackup";
import { Globe, Trash2, Download, Upload, RefreshCw } from "lucide-react";

type ImportState =
  | "idle"
  | "confirming"
  | "importing"
  | "success"
  | "error";

interface GeneralTabProps {
  onResetRequest: () => void;
}

export function GeneralTab({ onResetRequest }: GeneralTabProps) {
  const { t } = useI18n();
  const language = useSettingsStore((s) => s.language);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  // Countdown timer for auto-redirect after successful import
  useEffect(() => {
    if (importState !== "success") return;
    if (countdown <= 0) {
      window.location.href = "/";
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = Math.max(0, prev - 0.1);
        return Math.round(next * 10) / 10;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [importState, countdown]);

  const handleExport = async () => {
    try {
      await exportDatabase();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleImportClick = () => {
    setImportState("idle");
    setErrorMessage("");
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      // Quick validation: parse and count projects
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        setImportState("error");
        setErrorMessage(t("settings.importInvalidFile"));
        return;
      }

      const parsed = data as Record<string, unknown>;

      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.projects)
      ) {
        setImportState("error");
        setErrorMessage(t("settings.importInvalidFile"));
        return;
      }

      const count = parsed.projects.length;
      setPendingFile(file);
      setPendingCount(count);
      setImportState("confirming");
    } catch {
      setImportState("error");
      setErrorMessage(t("settings.importInvalidFile"));
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;

    setImportState("importing");
    try {
      const result = await importDatabase(pendingFile);
      setImportedCount(result.projectCount);
      setCountdown(5);
      setImportState("success");
      setPendingFile(null);
    } catch (err) {
      console.error("Import failed:", err);
      setImportState("error");
      setErrorMessage(t("settings.importInvalidFile"));
      setPendingFile(null);
    }
  };

  const handleCancelImport = () => {
    setImportState("idle");
    setPendingFile(null);
    setErrorMessage("");
  };

  const handleDismiss = () => {
    setImportState("idle");
    setErrorMessage("");
  };

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

      {/* Data Management */}
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
          onChange={handleFileSelected}
          className="hidden"
          aria-hidden
        />

        {/* Import confirmation */}
        {importState === "confirming" && (
          <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30">
            <p className="font-body-md text-on-surface mb-4">
              {t("settings.importConfirm").replace("%d", String(pendingCount))}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-full font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all"
              >
                {t("settings.importReplace")}
              </button>
              <button
                onClick={handleCancelImport}
                className="px-5 py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Importing spinner */}
        {importState === "importing" && (
          <p className="font-body-md text-on-surface-variant">{t("settings.importing")}</p>
        )}

        {/* Success */}
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

        {/* Error */}
        {importState === "error" && (
          <div className="bg-error-container/20 rounded-2xl p-4 border border-error/20">
            <p className="font-body-md text-error">{errorMessage}</p>
            <button
              onClick={handleDismiss}
              className="mt-2 px-4 py-1.5 rounded-full font-label-md text-error hover:bg-error-container/40 transition-all"
            >
              {t("common.ok")}
            </button>
          </div>
        )}
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
