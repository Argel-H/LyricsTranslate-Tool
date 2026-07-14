import { cn } from "@/lib/utils";
import type { ComponentType, SVGProps } from "react";

interface FloatingActionButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function FloatingActionButton({
  icon: Icon,
  label,
  onClick,
  className,
  disabled,
  title,
}: FloatingActionButtonProps) {
  return (
    <button
      data-keep-active
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title ?? label}
      className={cn(
        "flex items-center justify-center gap-2 shadow-xl border pressable font-label-lg transition-all",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <Icon className="size-5 shrink-0" />
      {label && <span>{label}</span>}
    </button>
  );
}
