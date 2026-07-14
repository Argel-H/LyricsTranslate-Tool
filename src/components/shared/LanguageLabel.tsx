import { RotatingFlag } from "@/components/shared/RotatingFlag";

export interface LanguageLabelProps {
  language: string | undefined;
  flagClassName?: string;
  fallback?: string;
}

export function LanguageLabel({
  language,
  flagClassName,
  fallback = "?",
}: LanguageLabelProps) {
  if (!language) {
    return <>{fallback}</>;
  }

  return (
    <>
      <RotatingFlag language={language} className={flagClassName} />
      {language}
    </>
  );
}
