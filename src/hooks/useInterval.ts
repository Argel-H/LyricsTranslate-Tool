import { useEffect, useRef } from "react";

// The callback lives in a ref so callers can pass inline closures without the
// interval being torn down on every render.
export function useInterval(callback: () => void, delay: number | null): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => {
      callbackRef.current();
    }, delay);

    return () => {
      clearInterval(id);
    };
  }, [delay]);
}
