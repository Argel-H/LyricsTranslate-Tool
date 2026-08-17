import { useRef, useState, type MouseEvent } from "react";
import { truncateUrl } from "@/lib/commentMarkdown";

export interface LinkTooltip {
  url: string;
  left: number;
  top: number;
}

const LINK_TOOLTIP_MAX_URL_LENGTH = 50;

/**
 * Tracks which link (by href) is hovered inside the markdown container and
 * reports a portal position for a custom URL tooltip. Re-fires only when the
 * hovered href changes.
 */
export function useLinkTooltip(): {
  tooltip: LinkTooltip | null;
  handleMouseMove: (e: MouseEvent<HTMLDivElement>) => void;
  handleMouseLeave: () => void;
} {
  const [tooltip, setTooltip] = useState<LinkTooltip | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href") ?? null;

    if (href === hoveredRef.current) return;
    hoveredRef.current = href;

    if (!anchor || !href) {
      setTooltip(null);
      return;
    }

    const rect = anchor.getBoundingClientRect();
    setTooltip({
      url: truncateUrl(href, LINK_TOOLTIP_MAX_URL_LENGTH),
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  };

  const handleMouseLeave = () => {
    hoveredRef.current = null;
    setTooltip(null);
  };

  return { tooltip, handleMouseMove, handleMouseLeave };
}
