import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/lib/constants"

interface StatusBadgeProps {
  status: ProjectStatus
  label?: string
  className?: string
}

const statusStyles: Record<ProjectStatus, string> = {
  "not-started": "bg-surface-variant/50 text-on-surface-variant/60",
  "in-progress": "bg-surface-variant text-on-surface-variant",
  "in-review": "bg-tertiary-container/20 text-tertiary-fixed border border-tertiary-container/30",
  "completed": "bg-primary-container/30 text-primary border border-primary/30",
}

const statusIcons: Record<ProjectStatus, string> = {
  "not-started": "radio_button_unchecked",
  "in-progress": "play_arrow",
  "in-review": "task_alt",
  "completed": "check_circle",
}

const defaultLabels: Record<ProjectStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "in-review": "In Review",
  "completed": "Completed",
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md",
        statusStyles[status],
        className
      )}
    >
      <span className="material-symbols-outlined text-[14px]">
        {statusIcons[status]}
      </span>
      {label ?? defaultLabels[status]}
    </span>
  )
}
