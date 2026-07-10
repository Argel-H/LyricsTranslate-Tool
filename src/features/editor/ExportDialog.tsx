import { useState, useEffect } from "react";
import { Download, FileText, Globe } from "lucide-react";
import { DropdownSelect } from "@/features/project-setup/DropdownSelect";
import { useI18n } from "@/hooks/useI18n";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onDownload: (
    format: "lrc" | "srt" | "yaml",
    language: "original" | "translated" | "proyecto",
  ) => void;
}

const FORMAT_DISPLAY: Record<string, string> = {
  lrc: "LRC (.lrc)",
  srt: "SRT (.srt)",
  yaml: "YAML (.yaml)",
};

const FORMAT_OPTIONS = ["LRC (.lrc)", "SRT (.srt)", "YAML (.yaml)"];

export function ExportDialog({ open, onClose, onDownload }: ExportDialogProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<"lrc" | "srt" | "yaml">("lrc");
  const [language, setLanguage] = useState<"original" | "translated" | "proyecto">("original");

  // Sync language when format toggles to/from "yaml"
  useEffect(() => {
    if (format === "yaml") {
      setLanguage("proyecto");
    } else if (language === "proyecto") {
      setLanguage("original");
    }
  }, [format]);

  if (!open) return null;

  const isYaml = format === "yaml";
  const languageOptions = isYaml
    ? [t("export.proyecto")]
    : [t("export.originalLyrics"), t("export.translatedLyrics")];

  const languageDisplayValue = isYaml
    ? t("export.proyecto")
    : language === "original"
      ? t("export.originalLyrics")
      : t("export.translatedLyrics");

  const handleFormatChange = (display: string) => {
    const entry = Object.entries(FORMAT_DISPLAY).find(([, v]) => v === display);
    if (entry) {
      setFormat(entry[0] as "lrc" | "srt" | "yaml");
    }
  };

  const handleLanguageChange = (display: string) => {
    if (isYaml) return; // should not fire when disabled, but guard anyway
    if (display === t("export.originalLyrics")) {
      setLanguage("original");
    } else if (display === t("export.translatedLyrics")) {
      setLanguage("translated");
    }
  };

  const handleDownload = () => {
    onDownload(format, language);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
        <h3 className="font-title-lg text-on-surface mb-2">{t("export.title")}</h3>
        <p className="font-body-md text-on-surface-variant mb-6">
          {t("export.description")}
        </p>

        <div className="flex flex-col gap-3">
          {/* Format dropdown */}
          <DropdownSelect
            icon={FileText}
            label={t("export.format")}
            value={FORMAT_DISPLAY[format]}
            options={FORMAT_OPTIONS}
            onChange={handleFormatChange}
            variant="compact"
          />

          {/* Language / Content dropdown */}
          <DropdownSelect
            icon={Globe}
            label={t("export.content")}
            value={languageDisplayValue}
            options={languageOptions}
            onChange={handleLanguageChange}
            variant="compact"
            disabled={isYaml}
          />

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="w-full py-3 rounded-full font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center gap-2"
          >
            <Download className="size-5" />
            {t("export.download")}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors mt-3"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
