import { useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useViewportShift } from "@/hooks/useViewportShift";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { CommentEditor } from "./CommentEditor";
import { CommentMarkdown } from "./CommentMarkdown";

interface CommentButtonProps {
  /** Markdown comment for this lyric line. */
  comment?: string;
  /** Persists the comment when the editor is committed. */
  onCommentSave?: (value: string) => void;
}

export function CommentButton({ comment, onCommentSave }: CommentButtonProps) {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const tooltipCardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { visible: tooltipVisible, onMouseEnter, onMouseLeave } = useHoverTooltip({
    showDelayMs: 150,
    hideDelayMs: 200,
    disabled: open,
  });
  const tooltipShift = useViewportShift(tooltipVisible, tooltipCardRef);

  const hasComment = !!comment?.trim();

  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={t("editor.comment")}
        title={t("editor.comment")}
        className={cn(
          "rounded-full p-0.5 transition-colors",
          hasComment
            ? "bg-primary-container text-on-primary-container"
            : "text-on-surface-variant hover:text-primary",
        )}
      >
        <MessageSquare className="size-4" />
      </button>

      {!open && hasComment && tooltipVisible && (
        <div
          ref={tooltipCardRef}
          className="absolute z-50"
          onClick={(e) => e.stopPropagation()}
          style={{
            left: "50%",
            bottom: "calc(100% + 0.5rem)",
            transform: `translateX(calc(-50% + ${tooltipShift}px))`,
          }}
        >
          <div className="bg-surface-container-high rounded-2xl shadow-lg border border-outline-variant/20 px-3 py-2 text-xs text-on-surface w-max max-w-[320px]">
            <CommentMarkdown
              className="text-body-md leading-relaxed"
              markdown={comment ?? ""}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="comment-popover"
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full z-50 mt-3 w-[min(340px,calc(100vw-2rem))] origin-top-right rounded-2xl bg-surface-container-high p-3 shadow-xl border border-outline-variant/20"
          >
            <CommentEditor
              initialValue={comment ?? ""}
              onSave={(value) => {
                if (value !== (comment ?? "")) {
                  onCommentSave?.(value);
                }
                setOpen(false);
              }}
              placeholder={t("editor.commentPlaceholder")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
