import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface MasterCardProps {
  children: ReactNode
  bgColor?: string
  className?: string
  header?: ReactNode
}

export function MasterCard({ children, bgColor = "bg-surface-container", className, header }: MasterCardProps) {
  return (
    <div
      className={cn(
        "flex-1 rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-outline-variant/20 relative",
        bgColor,
        className
      )}
    >
      {header}
      <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10">
        {children}
      </div>
    </div>
  )
}
