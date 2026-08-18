import { useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import {
  Braces,
  Captions,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Download,
  FileText,
  Folder,
  Languages,
  Music,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { useViewportShift } from "@/hooks/useViewportShift";
import type { I18nKey } from "@/i18n";
import type { TextCase } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

type FormatKey = "lrc" | "srt" | "yaml";
type LanguageKey = "original" | "translated" | "proyecto";
type LyricLanguage = "original" | "translated";
type Translator = (key: I18nKey) => string;

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onDownload: (format: FormatKey, language: LanguageKey, textCase: TextCase) => void;
}

interface RadioOption<T extends string> {
  value: T;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
}

interface RadioGroupProps<T extends string> {
  label: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

function RadioOptionCard<T extends string>({
  option,
  active,
  disabled,
  onSelect,
}: {
  option: RadioOption<T>;
  active: boolean;
  disabled: boolean;
  onSelect: (value: T) => void;
}) {
  const tooltipCardRef = useRef<HTMLDivElement>(null);
  const { visible: tooltipVisible, onMouseEnter, onMouseLeave } = useHoverTooltip({
    showDelayMs: 250,
    hideDelayMs: 150,
    disabled: !option.description,
  });
  const tooltipShift = useViewportShift(tooltipVisible, tooltipCardRef);
  const Icon = option.icon;

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        role="radio"
        aria-checked={active}
        disabled={disabled}
        onClick={() => onSelect(option.value)}
        className={cn(
          "w-full flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all duration-150",
          "aspect-square",
          active
            ? "bg-primary-container text-on-primary-container shadow-sm scale-[1.02]"
            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:scale-[1.01]",
          disabled && "cursor-default",
        )}
      >
        <Icon className="size-6" />
        <span className="text-xs font-medium text-center leading-tight break-words">{option.label}</span>
      </button>

      {option.description && tooltipVisible && (
        <div
          ref={tooltipCardRef}
          className="absolute z-50 pointer-events-none"
          style={{
            left: "50%",
            bottom: "calc(100% + 0.5rem)",
            transform: `translateX(calc(-50% + ${tooltipShift}px))`,
          }}
        >
          <div className="bg-surface-container-high rounded-2xl shadow-lg border border-outline-variant/20 px-3 py-2 text-xs text-on-surface w-max max-w-[280px] leading-relaxed">
            {option.description}
          </div>
        </div>
      )}
    </div>
  );
}

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: RadioGroupProps<T>) {
  return (
    <div>
      <span className="font-label-md text-on-surface-variant block mb-2">{label}</span>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <RadioOptionCard
            key={opt.value}
            option={opt}
            active={opt.value === value}
            disabled={disabled}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  );
}

function buildFormatOptions(t: Translator): RadioOption<FormatKey>[] {
  return [
    { value: "lrc", label: "LRC", icon: FileText, description: t("export.formatLrcDesc") },
    { value: "srt", label: "SRT", icon: Captions, description: t("export.formatSrtDesc") },
    { value: "yaml", label: "YAML", icon: Braces, description: t("export.formatYamlDesc") },
  ];
}

function buildLanguageOptions(t: Translator, isYaml: boolean): RadioOption<LanguageKey>[] {
  if (isYaml) {
    return [
      { value: "proyecto", label: t("export.proyecto"), icon: Folder, description: t("export.proyectoDesc") },
    ];
  }
  return [
    { value: "original", label: t("export.originalLyrics"), icon: Music, description: t("export.originalLyricsDesc") },
    { value: "translated", label: t("export.translatedLyrics"), icon: Languages, description: t("export.translatedLyricsDesc") },
  ];
}

function buildTextCaseOptions(t: Translator, isYaml: boolean): RadioOption<TextCase>[] {
  const options: RadioOption<TextCase>[] = [
    { value: "original", label: t("export.caseOriginal"), icon: CaseSensitive, description: t("export.caseOriginalDesc") },
  ];
  if (isYaml) {
    return options;
  }
  options.push(
    { value: "uppercase", label: t("export.caseUppercase"), icon: CaseUpper, description: t("export.caseUppercaseDesc") },
    { value: "lowercase", label: t("export.caseLowercase"), icon: CaseLower, description: t("export.caseLowercaseDesc") },
  );
  return options;
}

export function ExportDialog({ open, onClose, onDownload }: ExportDialogProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<FormatKey>("lrc");
  const [language, setLanguage] = useState<LyricLanguage>("original");
  const [textCase, setTextCase] = useState<TextCase>("original");

  if (!open) return null;

  const isYaml = format === "yaml";
  const contentKey: LanguageKey = isYaml ? "proyecto" : language;
  const effectiveTextCase: TextCase = isYaml ? "original" : textCase;

  const handleLanguageChange = (next: LanguageKey) => {
    if (next === "proyecto") return;
    setLanguage(next);
  };

  const handleDownload = () => {
    onDownload(format, contentKey, effectiveTextCase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
        <h3 className="font-title-lg text-on-surface mb-2">{t("export.title")}</h3>
        <p className="font-body-md text-on-surface-variant mb-6">
          {t("export.description")}
        </p>

        <div className="flex flex-col gap-5">
          <RadioGroup
            label={t("export.format")}
            options={buildFormatOptions(t)}
            value={format}
            onChange={setFormat}
          />

          <RadioGroup
            label={t("export.content")}
            options={buildLanguageOptions(t, isYaml)}
            value={contentKey}
            onChange={handleLanguageChange}
            disabled={isYaml}
          />

          <RadioGroup
            label={t("export.textCase")}
            options={buildTextCaseOptions(t, isYaml)}
            value={effectiveTextCase}
            onChange={setTextCase}
            disabled={isYaml}
          />

          <div className="flex overflow-hidden rounded-full border border-outline h-12">
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors border-r border-outline"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all"
            >
              <Download className="size-5" />
              {t("export.download")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
