/** Cycles an index (0..count-1) at a fixed interval. Returns 0 when count <= 1 or prefers-reduced-motion is active. */
import { useState, useEffect } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useRotatingIndex(
  count: number,
  intervalMs: number = 5000,
): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1 || prefersReducedMotion()) {
      setIndex(0);
      return;
    }

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, intervalMs);

    return () => clearInterval(id);
  }, [count, intervalMs]);

  return index;
}
