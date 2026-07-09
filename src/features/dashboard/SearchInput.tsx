import { Search } from "lucide-react";
import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";

interface SearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
}

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  results?: SearchResult[];
  onSelect?: (index: number) => void;
  isLoading?: boolean;
}

const dropdownAnimation = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1, ease: "easeIn" as const } },
};

export function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  className,
  results,
  onSelect,
  isLoading,
}: SearchInputProps) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
        zIndex: 50,
      });
    }
  };

  useEffect(() => {
    if (focused) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [focused]);

  const handleBlur = () => {
    setTimeout(() => setFocused(false), 150);
  };

  const showDropdown = focused && (isLoading || results !== undefined);

  return (
    <div
      ref={containerRef}
      className={cn("w-full max-w-2xl relative group", className)}
    >
      <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
        <Search className="size-6 text-on-surface-variant group-focus-within:text-primary transition-colors" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "block w-full pl-14 pr-6 py-5 bg-surface-container-highest border border-outline-variant/30 text-on-surface shadow-sm font-body-lg text-body-lg placeholder-on-surface-variant outline-none transition-all",
          showDropdown
            ? "rounded-t-md rounded-b-none border-b-0 duration-150"
            : "rounded-full duration-500",
        )}
      />
      <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 group-focus-within:scale-x-100 transition-transform duration-300 ease-out origin-center rounded-full" />
      {createPortal(
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              style={dropdownStyle}
              {...dropdownAnimation}
              onMouseDown={(e) => e.preventDefault()}
              className="bg-surface-container-high border border-outline-variant/20 border-t-0 rounded-b-md rounded-t-none shadow-2xl overflow-y-scroll overflow-x-hidden max-h-[280px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <M3LoadingIndicator size={72} style={{ color: "rgb(208, 188, 255)" }} />
                </div>
              ) : results && results.length > 0 ? (
                results.map((result, index) => (
                  <button
                    key={result.id ?? index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect?.(index);
                    }}
                    className="w-full text-left px-5 py-4 hover:bg-surface-container-highest transition-colors border-b border-outline-variant/10 last:border-b-0 flex items-center gap-3"
                  >
                    <Search className="size-4 text-on-surface-variant shrink-0" />
                    <div className="min-w-0">
                      <p className="font-body-md text-on-surface truncate">
                        {result.artistName} — {result.trackName}
                      </p>
                      {result.albumName && (
                        <p className="font-label-md text-on-surface-variant truncate mt-0.5">
                          {result.albumName}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-on-surface-variant font-body-md">
                  {t("common.noResults")}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
