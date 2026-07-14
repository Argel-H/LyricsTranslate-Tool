import { useEffect, type RefObject } from "react";

export function useClickOutside(
  elementRef: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean = true,
  excludeSelector?: string,
) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (excludeSelector && target.closest(excludeSelector)) return;
      if (elementRef.current && !elementRef.current.contains(target)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [elementRef, handler, enabled, excludeSelector]);
}
