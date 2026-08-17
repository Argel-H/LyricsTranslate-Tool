import { useEffect, useRef, useState } from "react";

interface UseHoverTooltipOptions {
  showDelayMs: number;
  hideDelayMs: number;
  disabled: boolean;
}

/**
 * Delayed show/hide tooltip visibility with hover enter/leave handlers.
 * `disabled` suppresses showing; a pending hide is cancelled on re-enter;
 * timers are cleared on unmount. `visible` is mirrored in a ref so the
 * timer callbacks never read a stale value.
 */
export function useHoverTooltip({
  showDelayMs,
  hideDelayMs,
  disabled,
}: UseHoverTooltipOptions): {
  visible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
} {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateVisible = (next: boolean) => {
    visibleRef.current = next;
    setVisible(next);
  };

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const onMouseEnter = () => {
    if (disabled) return;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (!visibleRef.current) {
      showTimerRef.current = setTimeout(() => updateVisible(true), showDelayMs);
    }
  };

  const onMouseLeave = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    hideTimerRef.current = setTimeout(() => updateVisible(false), hideDelayMs);
  };

  return { visible, onMouseEnter, onMouseLeave };
}
