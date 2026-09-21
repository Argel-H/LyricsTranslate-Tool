import { useCallback, useEffect, useRef } from "react";

// Debounced so rapid line changes don't oscillate.
const DEFAULT_SCROLL_DELAY_MS = 50;

// Rows are located via `data-row-key`, shared by TableRow and LyricsReadOnlyTable.
function scrollRowIntoView(key: string): void {
  const el = document.querySelector(`[data-row-key="${key}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function useScrollToActiveLine(
  activeKey: string | null,
  options?: { delayMs?: number; enabled?: boolean },
): { scrollNow: () => void } {
  const delayMs = options?.delayMs ?? DEFAULT_SCROLL_DELAY_MS;
  const enabled = options?.enabled !== false;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scrollNow = useCallback(() => {
    clearPending();
    if (activeKey) {
      scrollRowIntoView(activeKey);
    }
  }, [activeKey, clearPending]);

  useEffect(() => {
    if (!enabled || !activeKey) return;

    // Cancel any in-flight scroll before scheduling the new one.
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      scrollRowIntoView(activeKey);
    }, delayMs);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activeKey, delayMs, enabled]);

  return { scrollNow };
}
