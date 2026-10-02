import { cn } from "@/lib/utils"
import { Plus, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useLongPress } from "@/hooks/useLongPress"

interface TimeControlProps {
  time: string
  onAdd?: () => void
  onRemove?: () => void
  onLongPress?: () => void
  active?: boolean
  className?: string
}

interface TimeButtonProps {
  icon: LucideIcon
  onPress?: () => void
  onLongPress?: () => void
}

function TimeButton({ icon: Icon, onPress, onLongPress }: TimeButtonProps) {
  const { pressHandlers, wasLongPress } = useLongPress({ onLongPress })

  return (
    <button
      type="button"
      {...pressHandlers}
      onClick={(event) => {
        event.stopPropagation()
        if (wasLongPress()) return
        onPress?.()
      }}
      className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm select-none touch-none active:scale-95"
    >
      <Icon className="size-5" />
    </button>
  )
}

export function TimeControl({
  time,
  onAdd,
  onRemove,
  onLongPress,
  active,
  className,
}: TimeControlProps) {
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
          <TimeButton icon={Minus} onPress={onRemove} onLongPress={onLongPress} />
          <TimeButton icon={Plus} onPress={onAdd} onLongPress={onLongPress} />
        </div>
      )}
    </div>
  )
}
