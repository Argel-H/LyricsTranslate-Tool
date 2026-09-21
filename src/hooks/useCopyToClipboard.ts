import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_FEEDBACK_MS = 2_000;

export interface UseCopyToClipboardOptions {
  feedbackMs?: number;
}

export interface UseCopyToClipboardResult {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
}

export function useCopyToClipboard(
  options?: UseCopyToClipboardOptions,
): UseCopyToClipboardResult {
  const feedbackMs = options?.feedbackMs ?? DEFAULT_FEEDBACK_MS;

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Re-affirmed on mount because StrictMode double-invokes effects.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // The clipboard API throws in non-secure contexts or without focus.
        return false;
      }

      // The component may have unmounted while the write was in flight; avoid
      // scheduling a timer that would leak.
      if (!mountedRef.current) return true;

      setCopied(true);
      // Clear first so rapid copies extend the feedback rather than replace it.
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setCopied(false);
      }, feedbackMs);

      return true;
    },
    [clearTimer, feedbackMs],
  );

  return { copy, copied };
}
