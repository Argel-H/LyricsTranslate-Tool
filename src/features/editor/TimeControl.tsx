import { cn } from "@/lib/utils"
import { Plus, Minus } from "lucide-react"

interface TimeControlProps {
  time: string
  onAdd?: () => void
  onRemove?: () => void
  active?: boolean
  className?: string
}

export function TimeControl({ time, onAdd, onRemove, active, className }: TimeControlProps) {
  return (
    <div className={cn("flex flex-col gap-3 items-center justify-start pt-2", className)}>
      <div className={cn(
        "font-mono text-body-md rounded-full px-4 py-2 w-full text-center",
        active
          ? "text-primary bg-primary-container/20 border border-primary/20"
          : "text-on-surface-variant"
      )}>
        {time}
      </div>
      {active && (
        <div className="flex gap-2">
          <button
            onClick={onRemove}
            className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
          >
            <Minus className="size-5" />
          </button>
          <button
            onClick={onAdd}
            className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
          >
            <Plus className="size-5" />
          </button>
        </div>
      )}
    </div>
  )
}
