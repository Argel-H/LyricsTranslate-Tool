import { cn } from "@/lib/utils";
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
  return (
    <div
      className={cn(
        "flex rounded-l-lg rounded-r-[1em] overflow-hidden border border-outline h-12",
        className,
      )}
    >
      {segments.map((segment, i) => {
        const Icon = segment.icon;
        const isActive = segment.active;
        const isLast = i === segments.length - 1;

        return (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
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
