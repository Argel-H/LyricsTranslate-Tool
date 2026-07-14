import type { ComponentType, SVGProps } from "react";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLanguageFlags } from "@/lib/languageFlags";
import { useRotatingIndex } from "@/hooks/useRotatingIndex";
import { shuffleArray } from "@/lib/shuffleArray";
import { cn } from "@/lib/utils";

interface RotatingFlagProps {
  language: string;
  className?: string;
}

export function RotatingFlag({ language, className }: RotatingFlagProps) {
  const flags = useMemo(() => shuffleArray(getLanguageFlags(language)), [language]);
  const index = useRotatingIndex(flags.length);
  const Flag = flags[index];

  if (flags.length <= 1) {
    return (
      <Flag
        className={cn(
          "inline-block h-3 w-auto rounded-[2px] align-middle",
          className,
        )}
      />
    );
  }

  return (
    <span className={cn("inline-grid align-middle h-3", className)}>
      <AnimatePresence mode="sync" initial={false}>
        <motion.span
          key={index}
          style={{ gridArea: "1 / 1" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Flag className="h-full w-auto rounded-[2px]" />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function makeRotatingFlagIcon(
  language: string,
): ComponentType<SVGProps<SVGSVGElement>> {
  function RotatingFlagIcon({ className }: SVGProps<SVGSVGElement>) {
    return <RotatingFlag language={language} className={className} />;
  }
  return RotatingFlagIcon;
}

export function makeRotatingLanguageOptions(
  labels: string[],
): { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] {
  return labels.map((label) => ({ label, icon: makeRotatingFlagIcon(label) }));
}
