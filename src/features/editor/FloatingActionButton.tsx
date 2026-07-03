import { cn } from "@/lib/utils"
import type { ComponentType, SVGProps } from "react"

interface FloatingActionButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function FloatingActionButton({ icon: Icon, label, onClick, className, disabled }: FloatingActionButtonProps) {
  return (
    <div className="absolute bottom-8 right-8 z-50">
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={cn(
          "h-16 px-8 rounded-full bg-tertiary-container text-on-tertiary-container shadow-2xl flex items-center gap-3 hover:brightness-110 transition-all hover:scale-105 active:scale-95 border border-tertiary-container/50",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        <Icon className="size-6" />
        <span className="font-label-lg text-[16px]">{label}</span>
      </button>
    </div>
  )
}
