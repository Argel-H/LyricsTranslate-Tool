import { cn } from "@/lib/utils";
import { TimeControl } from "./TimeControl";
import { TranslationTextarea } from "./TranslationTextarea";
import { Trash2 } from "lucide-react";

interface TableRowProps {
  timeStart: string;
  timeEnd: string;
  lyric: string;
  translation: string;
  translationPlaceholder?: string;
  state?: "default" | "active" | "instrumental";
  onTranslationChange?: (value: string) => void;
  onLyricChange?: (value: string) => void;
  onTranslationFocus?: () => void;
  onTranslationBlur?: () => void;
  onRowClick?: () => void;
  onTimeStartAdd?: () => void;
  onTimeStartRemove?: () => void;
  onTimeEndAdd?: () => void;
  onTimeEndRemove?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function TableRow({
  timeStart,
  timeEnd,
  lyric,
  translation,
  translationPlaceholder,
  state = "default",
  onTranslationChange,
  onLyricChange,
  onTranslationFocus,
  onTranslationBlur,
  onRowClick,
  onTimeStartAdd,
  onTimeStartRemove,
  onTimeEndAdd,
  onTimeEndRemove,
  onDelete,
  className,
}: TableRowProps) {
  const isActive = state === "active";
  const isInstrumental = state === "instrumental";
  const textareaState = isActive
    ? "active"
    : translation
      ? "standard"
      : "empty";

  return (
    <div
      onClick={() => onRowClick?.()}
      className={cn(
        "grid grid-cols-[120px_120px_1fr_1fr] gap-4 p-md group relative",
        isActive
          ? "rounded-[32px] bg-surface-container-high shadow-xl border border-primary/20 mx-1 my-2"
          : "rounded-[24px] hover:bg-surface-container-highest/30 transition-all duration-200",
        className,
      )}
    >
      {/* Active row indicator */}
      {isActive && (
        <div className="absolute left-0.5 top-6 bottom-6 w-1 bg-primary rounded-full" />
      )}

      {/* Timestamps */}
      {isActive ? (
        <>
          <TimeControl
            time={timeStart}
            active
            onAdd={onTimeStartAdd}
            onRemove={onTimeStartRemove}
          />
          <TimeControl
            time={timeEnd}
            active
            onAdd={onTimeEndAdd}
            onRemove={onTimeEndRemove}
          />
        </>
      ) : (
        <>
          <div className="font-mono text-body-md text-on-surface flex items-center px-2">
            {timeStart}
          </div>
          <div className="font-mono text-body-md text-on-surface flex items-center px-2">
            {timeEnd}
          </div>
        </>
      )}

      {/* Lyric */}
      <div
        className={cn(
          isInstrumental
            ? "text-body-md text-on-surface-variant bg-surface-container rounded-3xl p-4 italic flex items-center"
            : isActive
              ? "flex items-center p-4"
              : "text-body-lg text-on-surface flex items-center p-4",
        )}
      >
        {isActive ? (
          <textarea
            value={lyric}
            onChange={(e) => onLyricChange?.(e.target.value)}
            onFocus={onTranslationFocus}
            onBlur={onTranslationBlur}
            className="w-full bg-surface-container rounded-3xl p-5 text-body-lg text-on-surface leading-relaxed min-h-[96px] focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        ) : (
          <div
            className={cn(
              isActive &&
                "w-full bg-surface-container rounded-3xl p-5 text-body-lg text-on-surface leading-relaxed min-h-[96px]",
            )}
          >
            {lyric}
          </div>
        )}
      </div>

      {/* Translation */}
      <div className="flex items-center">
        <TranslationTextarea
          value={translation}
          placeholder={translationPlaceholder}
          state={textareaState}
          onChange={onTranslationChange}
          onFocus={onTranslationFocus}
          onBlur={onTranslationBlur}
        />
      </div>

      {/* Delete button */}
      {!isInstrumental && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error transition-all duration-200",
            isActive
              ? "left-0 size-8 opacity-100"
              : "-left-2 size-6 opacity-0 group-hover:opacity-100 group-hover:size-8",
          )}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
