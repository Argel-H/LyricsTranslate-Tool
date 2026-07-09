import { ChevronLeft, ChevronRight, ArrowDown } from "lucide-react";
import { Keycap } from "@/components/shared/Keycap";
import type { TranslationSuggestion } from "@/lib/suggestionUtils";

interface TranslationSuggestionsProps {
  /** All available suggestions for the current lyric line */
  suggestions: TranslationSuggestion[];
  /** Currently selected suggestion index (0-based) */
  currentIndex: number;
  /** Called when the user navigates to a different suggestion */
  onIndexChange: (index: number) => void;
  /** Called when the user chooses to fill the current suggestion */
  onFill: (text: string) => void;
  /** Whether the translation textarea is focused — controls hint visibility */
  focused: boolean;
}

/**
 * Renders suggestion overlay and navigation controls for the translation textarea.
 *
 * Responsibilities:
 * - Displays the current suggestion text as an overlay placeholder
 * - Shows keyboard hint badges (← → ↓) when focused
 * - Renders prev/next navigation buttons and a counter when multiple suggestions exist
 * - Renders a fill button to apply the selected suggestion
 */
export function TranslationSuggestions({
  suggestions,
  currentIndex,
  onIndexChange,
  onFill,
  focused,
}: TranslationSuggestionsProps) {
  const suggestionsCount = suggestions.length;

  if (suggestionsCount === 0) return null;

  // Clamp index to valid range to prevent out-of-bounds during transition
  const safeIndex = Math.min(currentIndex, Math.max(0, suggestionsCount - 1));
  const currentSuggestion = suggestions[safeIndex]!;

  return (
    <>
      {/* Rich placeholder overlay — shown when textarea is empty */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden p-4"
      >
        {focused ? (
          /* Focused: suggestion text at top, keyboard hints at bottom */
          <div className="flex flex-col justify-between h-full w-full">
            <span className="text-body-lg text-on-surface-variant/60 truncate">
              {currentSuggestion.text}
            </span>
            <div className="flex items-center gap-1 text-label-sm text-on-surface-variant/50">
              {suggestionsCount > 1 && (
                <>
                  <Keycap>←</Keycap>
                  <Keycap>→</Keycap>
                  <span>to cycle</span>
                  <span className="mx-1">·</span>
                </>
              )}
              <Keycap>↓</Keycap>
              <span>to fill</span>
            </div>
          </div>
        ) : (
          /* Not focused: just the suggestion text */
          <div className="w-full">
            <span className="text-body-lg text-gray-400 truncate">
              {currentSuggestion.text}
            </span>
          </div>
        )}
      </div>

      {/* Navigation and fill buttons — only when focused */}
      {focused && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 z-10">
          {suggestionsCount > 1 && (
            <>
              <button
                onClick={() =>
                  onIndexChange(
                    (currentIndex - 1 + suggestionsCount) % suggestionsCount,
                  )
                }
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                type="button"
                aria-label="Previous suggestion"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-label-sm text-on-surface-variant tabular-nums min-w-[2rem] text-center select-none">
                {safeIndex + 1}/{suggestionsCount}
              </span>
              <button
                onClick={() =>
                  onIndexChange((currentIndex + 1) % suggestionsCount)
                }
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                type="button"
                aria-label="Next suggestion"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => onFill(currentSuggestion.text)}
            className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-colors"
            title={`Fill "${currentSuggestion.text}" (from line ${currentSuggestion.sourceLineNumber})`}
            type="button"
          >
            <ArrowDown className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
