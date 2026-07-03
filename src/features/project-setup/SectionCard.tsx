import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionCardProps {
  title: string
  children: ReactNode
  gap?: "md" | "lg"
  className?: string
}

export function SectionCard({ title, children, gap = "md", className }: SectionCardProps) {
  return (
    <section
      className={cn(
        "bg-surface-container p-8 rounded-section border border-outline-variant/10 shadow-sm flex flex-col",
        gap === "lg" ? "gap-lg" : "gap-md",
        className
      )}
    >
      <h2 className="font-title-lg text-title-lg text-on-surface mb-xs">{title}</h2>
      {children}
    </section>
  )
}
