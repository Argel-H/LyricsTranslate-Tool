import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface RoundedInputProps {
  label: string
  value: string
  onChange?: (value: string) => void
  onClear?: () => void
  readOnly?: boolean
  className?: string
}

export function RoundedInput({ label, value, onChange, onClear, readOnly, className }: RoundedInputProps) {
  return (
    <div
      className={cn(
        "relative bg-surface-container-high rounded-3xl px-4 py-2 border border-outline-variant/50 transition-all group",
        className
      )}
    >
      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
        {label}
      </label>
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          className="bg-transparent border-none focus:ring-0 text-on-surface w-full p-0 font-body-md text-body-md outline-none"
        />
        {!readOnly && value && onClear && (
          <button onClick={onClear} className="text-on-surface-variant hover:text-on-surface shrink-0 ml-2">
            <X className="size-4" />
          </button>
        )}
      </div>
      {/* Animated underline on hover/focus */}
      <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-primary scale-x-0 group-hover:scale-x-100 group-focus-within:scale-x-100 transition-transform duration-300 ease-out origin-center rounded-full" />
    </div>
  )
}
