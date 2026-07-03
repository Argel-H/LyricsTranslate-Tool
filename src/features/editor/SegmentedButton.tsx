import { cn } from "@/lib/utils";
import type { ComponentType, SVGProps } from "react";

interface Segment {
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  active?: boolean;
}

interface SegmentedButtonProps {
  segments: [Segment, Segment];
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
        "flex rounded-full overflow-hidden border border-outline h-12",
        className,
      )}
    >
      {segments.map((segment, i) => {
        const Icon = segment.icon;
        const isActive = segment.active ?? i === 1;
        const isLast = i === segments.length - 1;

        return (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
            className={cn(
              "px-6 flex items-center gap-2 transition-colors duration-200 font-label-lg",
              isActive
                ? "bg-primary-container !text-on-primary-container hover:brightness-110"
                : "text-on-surface hover:bg-secondary-container/30",
              !isLast && "border-r border-outline",
            )}
          >
            {Icon && <Icon className="size-4" />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
