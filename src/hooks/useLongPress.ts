import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export const LONG_PRESS_DELAY_MS = 500;

export interface UseLongPressOptions {
  onLongPress?: () => void;
  delayMs?: number;
}

export interface UseLongPressResult {
  pressHandlers: {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
    onContextMenu: (event: ReactMouseEvent) => void;
  };
  wasLongPress: () => boolean;
}

export function useLongPress({
  onLongPress,
  delayMs = LONG_PRESS_DELAY_MS,
}: UseLongPressOptions): UseLongPressResult {
  const timerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const onLongPressRef = useRef(onLongPress);

  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const startPress = useCallback(() => {
    clearTimer();
    longPressFiredRef.current = false;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      longPressFiredRef.current = true;
      onLongPressRef.current?.();
    }, delayMs);
  }, [clearTimer, delayMs]);

  const endPress = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const ignoreContextMenu = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
  }, []);

  const wasLongPress = useCallback(() => {
    if (!longPressFiredRef.current) return false;
    longPressFiredRef.current = false;
    return true;
  }, []);

  return {
    pressHandlers: {
      onPointerDown: startPress,
      onPointerUp: endPress,
      onPointerLeave: endPress,
      onPointerCancel: endPress,
      onContextMenu: ignoreContextMenu,
    },
    wasLongPress,
  };
}
