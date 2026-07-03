import { cn } from "@/lib/utils"

interface ProjectProgressBarProps {
  value: number
  color?: "primary" | "tertiary"
  className?: string
}

export function ProjectProgressBar({ value, color = "primary", className }: ProjectProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            color === "tertiary" ? "bg-tertiary" : "bg-primary"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
