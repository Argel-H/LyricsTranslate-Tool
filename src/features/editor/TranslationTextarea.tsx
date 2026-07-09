import { cn } from "@/lib/utils";

interface TranslationTextareaProps {
  value: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  ref?: (node: HTMLTextAreaElement | null) => void;
  disabled?: boolean;
}

export function TranslationTextarea({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder,
  className,
  ref,
  disabled,
}: TranslationTextareaProps) {
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(
        "w-full bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface leading-relaxed focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-none",
        className,
      )}
      disabled={disabled}
    />
  );
}
