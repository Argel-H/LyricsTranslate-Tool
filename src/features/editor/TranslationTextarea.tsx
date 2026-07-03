import { cn } from "@/lib/utils"

interface TranslationTextareaProps {
  value: string
  placeholder?: string
  state?: "active" | "default"
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  dataColumn?: string
  textareaRef?: (node: HTMLTextAreaElement | null) => void
  className?: string
}

const stateStyles = {
  default: "bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface placeholder:text-outline-variant/60 focus:ring-2 focus:ring-primary focus:border-primary min-h-[60px]",
  active: "bg-surface-container-highest border-2 border-primary rounded-3xl p-5 text-body-lg text-on-surface shadow-inner min-h-[96px]",
}

export function TranslationTextarea({ value, placeholder, state = "default", onChange, onFocus, onBlur, onKeyDown, dataColumn, textareaRef, className }: TranslationTextareaProps) {
  return (
    <textarea
      ref={textareaRef}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      data-column={dataColumn}
      rows={state === "active" ? 3 : 2}
      className={cn(
        "w-full focus:outline-none transition-all resize-none",
        stateStyles[state],
        className
      )}
    />
  )
}
