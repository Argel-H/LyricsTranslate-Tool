import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "in-progress" | "in-review"
  label?: string
  className?: string
}

const statusStyles = {
  "in-progress": "bg-surface-variant text-on-surface-variant",
  "in-review": "bg-tertiary-container/20 text-tertiary-fixed border border-tertiary-container/30",
}

const statusIcons = {
  "in-progress": "play_arrow",
  "in-review": "task_alt",
}

const defaultLabels = {
  "in-progress": "In Progress",
  "in-review": "In Review",
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
