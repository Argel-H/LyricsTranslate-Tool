import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ComponentType, SVGProps } from "react";

interface Segment {
  label?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  active?: boolean;
}

interface SegmentedButtonProps {
  segments: Segment[];
  onSelect?: (index: number) => void;
  className?: string;
}

export function SegmentedButton({
  segments,
  onSelect,
  className,
}: SegmentedButtonProps) {
  const defaultActive = segments.findIndex((s) => s.active);
  const [activeIndex, setActiveIndex] = useState(
    defaultActive >= 0 ? defaultActive : 1,
  );

  const handleClick = (index: number) => {
    setActiveIndex(index);
    onSelect?.(index);
  };

  return (
    <div
      className={cn(
        "flex rounded-l-lg rounded-r-[1em] overflow-hidden border border-outline h-12",
        className,
      )}
    >
      {segments.map((segment, i) => {
        const Icon = segment.icon;
        const isActive = i === activeIndex;
        const isLast = i === segments.length - 1;

        return (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={cn(
              "flex items-center justify-center gap-2 px-4 font-label-lg whitespace-nowrap transition-all duration-300 pressable",
              isActive
                ? "flex-[1.4] bg-primary-container !text-on-primary-container"
                : "flex-[0.6] text-on-surface hover:bg-secondary-container/30",
              !isLast && "border-r border-outline",
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
