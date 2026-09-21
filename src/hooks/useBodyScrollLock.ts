import { useEffect } from "react";

// Module scope, not a ref: locks live on independent component instances.
// The first lock captures the original overflow; only the last release restores it.
let lockCount = 0;
let originalOverflow = "";

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [active]);
}
