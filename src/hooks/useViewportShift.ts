import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Returns a horizontal pixel offset needed to keep a floating card (tooltip,
 * popover) inside the viewport, given a fixed `left: 50%` anchor.
 *
 * `RefObject<HTMLElement | null>` accepts both `useRef<HTMLElement>(null)`
 * and `useRef<HTMLDivElement>(null)` refs.
 */
export function useViewportShift(
  visible: boolean,
  cardRef: RefObject<HTMLElement | null>,
): number {
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    if (!visible || !cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const margin = 8;
    let next = 0;
    if (card.left < margin) {
      next = margin - card.left;
    } else if (card.right > window.innerWidth - margin) {
      next = window.innerWidth - margin - card.right;
    }
    setShift(next);
  }, [visible, cardRef]);

  return shift;
}
