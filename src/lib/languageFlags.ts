/** Resolves a language name to its country-flag icon component(s). */
import type { ComponentType, SVGProps } from "react";
import {
  US,
  GB,
  ES,
  MX,
  AR,
  CO,
  CL,
  PE,
  VE,
  EC,
  GT,
  BO,
  PT,
  BR,
  FR,
  CA,
  BE,
  DE,
  AT,
  CH,
  IT,
  JP,
  KR,
  CN,
  TW,
  SA,
  EG,
  AE,
  MA,
  RU,
  IN,
} from "country-flag-icons/react/3x2";
import { Globe } from "lucide-react";

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

const LANGUAGE_FLAGS: Record<string, FlagComponent[]> = {
  English: [US, GB],
  Spanish: [ES, MX, AR, CO, CL, PE, VE, EC, GT, BO],
  Portuguese: [PT, BR],
  French: [FR, CA, BE, CH],
  German: [DE, AT, CH],
  Arabic: [SA, EG, AE, MA],
  Chinese: [CN, TW],
  Italian: [IT],
  Japanese: [JP],
  Korean: [KR],
  Russian: [RU],
  Hindi: [IN],
};

export function getLanguageFlags(language: string): FlagComponent[] {
  return LANGUAGE_FLAGS[language] ?? [Globe];
}

export function getLanguageFlag(
  language: string,
): FlagComponent {
  return getLanguageFlags(language)[0];
}

export const LANGUAGE_OPTIONS: {
  label: string;
  icon: FlagComponent;
}[] = [
  { label: "English", icon: US },
  { label: "Spanish", icon: ES },
  { label: "Portuguese", icon: PT },
  { label: "French", icon: FR },
  { label: "German", icon: DE },
  { label: "Italian", icon: IT },
  { label: "Japanese", icon: JP },
  { label: "Korean", icon: KR },
  { label: "Chinese", icon: CN },
  { label: "Arabic", icon: SA },
  { label: "Russian", icon: RU },
  { label: "Hindi", icon: IN },
];
