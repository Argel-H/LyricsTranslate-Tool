import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  onBack?: () => void;
  bgColor?: string;
  actions?: ReactNode;
  showBorder?: boolean;
  className?: string;
}

export function TopBar({
  title,
  onBack,
  bgColor = "bg-surface-container",
  actions,
  showBorder = true,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex justify-between items-center w-full pl-4 pr-8 md:pr-12 md:pl-6 pb-4 pt-6 shrink-0 transition-colors duration-300",
        showBorder && "border-b border-outline-variant/10",
        bgColor,
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="size-12 w-14 rounded-l-[10rem] rounded-r-[1rem] bg-surface-container-highest hover:bg-surface-container-high transition-colors duration-200 text-on-surface flex items-center justify-center pressable"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center">{actions}</div>}
    </header>
  );
}
