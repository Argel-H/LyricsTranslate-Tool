import { cn } from "@/lib/utils";
import type { ComponentType, SVGProps } from "react";

interface NavButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  active?: boolean;
  className?: string;
}

export function NavButton({
  icon: Icon,
  label,
  active,
  className,
}: NavButtonProps) {
  return (
    <button
      className={cn(
        "w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-2xl cursor-pointer group pressable",
        active
          ? "bg-secondary-container text-on-secondary-container hover:bg-primary-container hover:!text-on-primary-container [&_svg]:fill-current"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
        className,
      )}
    >
      <Icon className="size-6 group-hover:scale-110 transition-transform" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
