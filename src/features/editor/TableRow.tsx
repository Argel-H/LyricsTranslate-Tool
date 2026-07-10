import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { TimeControl } from "./TimeControl";
import { TranslationTextarea } from "./TranslationTextarea";
import { TranslationSuggestions } from "./TranslationSuggestions";
import { Trash2, Lock, LockOpen } from "lucide-react";
import type { TranslationSuggestion } from "@/lib/suggestionUtils";
import { useI18n } from "@/hooks/useI18n";

interface TableRowProps {
  timeStart: string;
  timeEnd: string;
  lyric: string;
  translation: string;
  translationPlaceholder?: string;
  suggestions?: TranslationSuggestion[];
  state?: "default" | "active" | "instrumental";
  rowKey: string;
  orderedKeys: string[];
  onNavigateToRow: (targetKey: string, column: string) => void;
  onTranslationChange?: (value: string) => void;
  onLyricChange?: (value: string) => void;
  onTranslationFocus?: () => void;
  onTranslationBlur?: (relatedTarget: EventTarget | null) => void;
  focusedColumn?: string | null;
  onLyricFocus?: () => void;
  onLyricBlur?: (relatedTarget: EventTarget | null) => void;
  onRowClick?: (column?: string) => void;
  onTimeStartAdd?: () => void;
  onTimeStartRemove?: () => void;
  onTimeEndAdd?: () => void;
  onTimeEndRemove?: () => void;
  onDelete?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  showLock?: boolean;
  isAudioActive?: boolean;
  className?: string;
}

export function TableRow({
  timeStart,
  timeEnd,
  lyric,
  translation,
  translationPlaceholder,
  suggestions,
  state = "default",
  rowKey,
  orderedKeys,
  onNavigateToRow,
  onTranslationChange,
  onLyricChange,
  onTranslationFocus,
  onTranslationBlur,
  focusedColumn,
  onLyricFocus,
  onLyricBlur,
  onRowClick,
  onTimeStartAdd,
  onTimeStartRemove,
  onTimeEndAdd,
  onTimeEndRemove,
  onDelete,
  isLocked = false,
  onToggleLock,
  showLock = false,
  isAudioActive = false,
  className,
}: TableRowProps) {
  const isActive = state === "active";
  const isInstrumental = state === "instrumental";

  const { t } = useI18n();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipCardRef = useRef<HTMLDivElement>(null);
  const [tooltipShift, setTooltipShift] = useState(0);

  const showTooltip = () => {
    tooltipTimerRef.current = setTimeout(() => setTooltipVisible(true), 150);
  };
  const hideTooltip = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltipVisible(false);
  };

  const suggestionsCount = suggestions?.length ?? 0;
  const isTranslationFocused = isActive && focusedColumn === "translation";
  const isTranslationCompact =
    !translation?.trim() && !isTranslationFocused && !isActive;

  // Reset index when the number of suggestions changes (e.g., new translations added)
  useEffect(() => {
    setCurrentIndex(0);
  }, [suggestionsCount]);

  // Cleanup tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  // Adjust tooltip position to stay within viewport
  useLayoutEffect(() => {
    if (tooltipVisible && tooltipCardRef.current) {
      const card = tooltipCardRef.current.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const margin = 8;
      let shift = 0;

      if (card.left < margin) {
        // Overflowing left edge — shift right
        shift = margin - card.left;
      } else if (card.right > viewportW - margin) {
        // Overflowing right edge — shift left
        shift = viewportW - margin - card.right;
      }

      setTooltipShift(shift);
    }
  }, [tooltipVisible]);

  // When suggestions exist and field is empty, suppress native placeholder
  // (TranslationSuggestions renders the overlay instead)
  const textareaPlaceholder =
    suggestions && suggestionsCount > 0 && !translation?.trim()
      ? undefined
      : translationPlaceholder;

  const lyricTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (
        node &&
        focusedColumn === "lyric" &&
        isActive &&
        document.activeElement !== node
      ) {
        queueMicrotask(() => {
          if (document.activeElement !== node) {
            node.focus();
            node.setSelectionRange(node.value.length, node.value.length);
          }
        });
      }
    },
    [focusedColumn, isActive],
  );

  const translationRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (
        node &&
        focusedColumn === "translation" &&
        isActive &&
        document.activeElement !== node
      ) {
        node.focus();
        node.setSelectionRange(node.value.length, node.value.length);
      }
    },
    [focusedColumn, isActive],
  );

  const navigateVertically = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    column: string,
  ) => {
    if (event.key !== "Tab") return;
    const currentIndex = orderedKeys.indexOf(rowKey);
    const direction = event.shiftKey ? -1 : 1;
    let targetIndex = currentIndex + direction;
    if (targetIndex < 0) targetIndex = orderedKeys.length - 1;
    else if (targetIndex >= orderedKeys.length) targetIndex = 0;
    event.preventDefault();
    onNavigateToRow(orderedKeys[targetIndex], column);
  };

  const handleTranslationKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (suggestions && suggestionsCount > 0 && !translation?.trim()) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex(
          (prev) => (prev - 1 + suggestionsCount) % suggestionsCount,
        );
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % suggestionsCount);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const safeIndex = Math.min(
          currentIndex,
          Math.max(0, suggestionsCount - 1),
        );
        onTranslationChange?.(suggestions[safeIndex]!.text);
        return;
      }
    }
    navigateVertically(e, "translation");
  };

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const column = target
          .closest("[data-column]")
          ?.getAttribute("data-column");
        onRowClick?.(column ?? undefined);
      }}
      data-row-key={rowKey}
      className={cn(
        "grid grid-cols-[120px_120px_1fr_1fr] gap-4 p-md group relative items-stretch",
        isActive
          ? "rounded-[32px] bg-surface-container-high shadow-xl border border-primary/20 mx-1 my-2"
          : "rounded-[24px] hover:bg-surface-container-highest/30 transition-all duration-200",
        isAudioActive && !isActive && "bg-primary/5",
        className,
      )}
    >
      {/* Active row indicator */}
      {isActive && (
        <div className="absolute left-0.5 top-6 bottom-6 w-1 bg-primary rounded-full" />
      )}

      {/* Audio-active indicator (pulsing, only when NOT click-active) */}
      {isAudioActive && !isActive && (
        <div className="absolute left-0.5 top-6 bottom-6 w-1 bg-primary rounded-full animate-pulse" />
      )}

      {/* Timestamps */}
      {isActive ? (
        <>
          <TimeControl
            time={timeStart}
            active
            onAdd={onTimeStartAdd}
            onRemove={onTimeStartRemove}
          />
          <TimeControl
            time={timeEnd}
            active
            onAdd={onTimeEndAdd}
            onRemove={onTimeEndRemove}
          />
        </>
      ) : (
        <>
          <div className="font-mono text-body-md text-on-surface flex items-center px-2">
            {timeStart}
          </div>
          <div className="font-mono text-body-md text-on-surface flex items-center px-2">
            {timeEnd}
          </div>
        </>
      )}

      {/* Lyric */}
      <div
        data-column="lyric"
        className={cn(
          isInstrumental
            ? "text-body-md text-on-surface-variant bg-surface-container rounded-3xl p-4 italic flex items-center"
            : "flex items-center",
        )}
      >
        {isActive ? (
          <textarea
            value={lyric}
            onChange={(e) => onLyricChange?.(e.target.value)}
            onFocus={onLyricFocus}
            onBlur={(e) => onLyricBlur?.(e.relatedTarget)}
            onKeyDown={(e) => navigateVertically(e, "lyric")}
            data-column="lyric"
            ref={lyricTextareaRef}
            className="w-full bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface leading-relaxed h-28 focus:outline-none resize-none"
            rows={3}
          />
        ) : (
          <div
            data-column="lyric"
            className="w-full text-body-lg text-on-surface leading-relaxed"
          >
            {lyric}
          </div>
        )}
      </div>

      {/* Translation */}
      <div className="flex items-center gap-2" data-column="translation">
        {translation?.trim() && !isTranslationFocused ? (
          <div
            data-column="translation"
            className={cn(
              "flex-1 bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface leading-relaxed",
              isActive ? "h-28" : "min-h-18",
            )}
          >
            {translation}
          </div>
        ) : (
          // Edit mode: textarea with suggestion support
          <div className="relative flex-1">
            <TranslationTextarea
              value={translation}
              placeholder={textareaPlaceholder}
              onChange={onTranslationChange}
              onFocus={onTranslationFocus}
              onKeyDown={handleTranslationKeyDown}
              className={cn(
                isActive && "h-[6.6rem]",
                isTranslationCompact && "h-20",
              )}
              onBlur={(e) => onTranslationBlur?.(e.relatedTarget)}
              ref={translationRef}
            />

            {suggestions && suggestionsCount > 0 && !translation?.trim() && (
              <TranslationSuggestions
                suggestions={suggestions}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                onFill={(text) => onTranslationChange?.(text)}
                focused={isTranslationFocused}
              />
            )}
          </div>
        )}

        {showLock && (
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock?.();
              }}
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
              className={cn(
                "rounded-full p-0.5 transition-colors",
                isLocked
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:text-primary",
              )}
            >
              {isLocked ? (
                <Lock className="size-4" />
              ) : (
                <LockOpen className="size-4" />
              )}
            </button>
            {tooltipVisible && (
              <>
                {/* Tooltip card — shifts horizontally to stay in viewport */}
                <div
                  ref={tooltipCardRef}
                  className="absolute bottom-full z-50 mb-3"
                  style={{
                    left: "50%",
                    transform: `translateX(calc(-50% + ${tooltipShift}px))`,
                  }}
                >
                  <div className="bg-surface-container-high rounded-2xl shadow-lg border border-outline-variant/20 px-3 py-2 text-xs text-on-surface w-max max-w-[320px]">
                    {isLocked
                      ? t("editor.unlockTooltip")
                      : t("editor.lockTooltip")}
                  </div>
                </div>
                {/* Arrow — always centered on the button, above the card */}
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 z-50"
                  style={{ marginBottom: "11px" }}
                >
                  <div className="w-2 h-2 bg-surface-container-high border-r border-b border-outline-variant/20 rotate-45" />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete button */}
      {!isInstrumental && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error transition-all duration-200",
            isActive
              ? "left-0 size-8 opacity-100"
              : "-left-2 size-6 opacity-0 group-hover:opacity-100 group-hover:size-8",
          )}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
