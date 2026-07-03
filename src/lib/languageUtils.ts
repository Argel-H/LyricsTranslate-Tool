import type { LanguageCode } from "@/lib/constants";

const INTERFACE_TO_TRANSLATION_LANGUAGE: Record<LanguageCode, string> = {
  en: "Spanish",
  es: "Spanish",
  pt: "Portuguese",
};

export function interfaceLanguageToTranslationLanguage(language: LanguageCode): string {
  return INTERFACE_TO_TRANSLATION_LANGUAGE[language];
}

export function interfaceLanguageToEditorTarget(language: LanguageCode): string {
  return language === "pt" ? "pt" : "es";
}
