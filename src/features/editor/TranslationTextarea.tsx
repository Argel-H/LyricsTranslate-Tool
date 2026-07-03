import { cn } from "@/lib/utils"

interface TranslationTextareaProps {
  value: string
  placeholder?: string
  state?: "standard" | "empty" | "active"
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
}

const stateStyles = {
  standard: "bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface focus:ring-2 focus:ring-primary focus:border-primary min-h-[60px]",
  empty: "bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface placeholder:text-outline-variant/60 focus:ring-2 focus:ring-primary focus:border-primary min-h-[60px]",
  active: "bg-surface-container-highest border-2 border-primary rounded-3xl p-5 text-body-lg text-on-surface shadow-inner min-h-[96px]",
}

export function TranslationTextarea({ value, placeholder, state = "standard", onChange, onFocus, onBlur, className }: TranslationTextareaProps) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      rows={state === "active" ? 3 : 2}
      className={cn(
        "w-full focus:outline-none transition-all resize-none",
        stateStyles[state],
        className
      )}
    />
  )
}
