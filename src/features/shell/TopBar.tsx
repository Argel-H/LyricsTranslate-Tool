import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface TopBarProps {
  title: string
  onBack?: () => void
  bgColor?: string
  actions?: ReactNode
  showBorder?: boolean
  className?: string
}

export function TopBar({ title, onBack, bgColor = "bg-surface-container", actions, showBorder = true, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex justify-between items-center w-full px-8 md:px-12 py-4 shrink-0",
        showBorder && "border-b border-outline-variant/10",
        bgColor,
        className
      )}
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-surface-variant/40 transition-colors duration-200 text-on-surface flex items-center justify-center"
          >
            <ArrowLeft className="size-6" />
          </button>
        )}
        <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          {title}
        </h1>
      </div>
      {actions && (
        <div className="flex items-center">
          {actions}
        </div>
      )}
    </header>
  )
}
