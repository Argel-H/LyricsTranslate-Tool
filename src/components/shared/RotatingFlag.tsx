/** Renders a language's country flag(s) with crossfade rotation every 5s. */
import type { ComponentType, SVGProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLanguageFlags } from "@/lib/languageFlags";
import { useRotatingIndex } from "@/hooks/useRotatingIndex";
import { cn } from "@/lib/utils";

interface RotatingFlagProps {
  language: string;
  className?: string;
}

export function RotatingFlag({ language, className }: RotatingFlagProps) {
  const flags = getLanguageFlags(language);
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
    <span className="inline-grid align-middle">
      <AnimatePresence mode="sync" initial={false}>
        <motion.span
          key={index}
          style={{ gridArea: "1 / 1" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Flag
            className={cn(
              "inline-block h-3 w-auto rounded-[2px] align-middle",
              className,
            )}
          />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Creates a component compatible with DropdownSelect's icon prop that
 * renders a RotatingFlag internally. Memorize the result per language
 * to prevent remount cycling from restarting the rotation timer.
 */
export function makeRotatingFlagIcon(
  language: string,
): ComponentType<SVGProps<SVGSVGElement>> {
  function RotatingFlagIcon({ className }: SVGProps<SVGSVGElement>) {
    return <RotatingFlag language={language} className={className} />;
  }
  return RotatingFlagIcon;
}
