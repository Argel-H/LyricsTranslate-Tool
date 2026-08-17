import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Link as LinkIcon,
  Check,
  X,
} from "lucide-react";
import { applyCommentStyle, isUrl, type ApplyStyleResult, type CommentStyle } from "@/lib/commentMarkdown";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface CommentEditorProps {
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}

function ToolbarButton({ label, onClick, active, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface",
        active && "bg-primary-container text-on-primary-container",
      )}
    >
      {children}
    </button>
  );
}

export function CommentEditor({
  initialValue,
  onSave,
  placeholder,
}: CommentEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const [draft, setDraft] = useState(initialValue);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Whether the user has modified the comment text from its initial value.
  const hasChanges = draft !== initialValue;

  const captureSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    selectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
  };

  const commitStyle = (result: ApplyStyleResult) => {
    setDraft(result.text);
    selectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(result.selectionStart, result.selectionEnd);
      }
    });
  };

  const applyStyle = (style: CommentStyle, url?: string) => {
    const { start, end } = selectionRef.current;
    commitStyle(applyCommentStyle(draft, start, end, style, url));
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const url = e.clipboardData.getData("text/plain").trim();

    if (start === end || !isUrl(url)) return;

    e.preventDefault();
    commitStyle(applyCommentStyle(draft, start, end, "link", url));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.metaKey && !e.ctrlKey) return;

    const key = e.key.toLowerCase();
    if (key === "b") {
      e.preventDefault();
      applyStyle("bold");
    } else if (key === "i") {
      e.preventDefault();
      applyStyle("italic");
    } else if (key === "u") {
      e.preventDefault();
      applyStyle("underline");
    } else if (key === "k") {
      e.preventDefault();
      setLinkOpen(true);
      setLinkUrl("");
    }
  };

  const handleLinkSubmit = (e: FormEvent) => {
    e.preventDefault();
    applyStyle("link", linkUrl);
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <ToolbarButton
          label={t("editor.commentBold")}
          onClick={() => applyStyle("bold")}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.commentItalic")}
          onClick={() => applyStyle("italic")}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.commentUnderline")}
          onClick={() => applyStyle("underline")}
        >
          <Underline className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.commentHighlight")}
          onClick={() => applyStyle("highlight")}
        >
          <Highlighter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.commentLink")}
          active={linkOpen}
          onClick={() => {
            setLinkOpen((prev) => !prev);
            setLinkUrl("");
          }}
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>
      </div>

      {linkOpen && (
        <form onSubmit={handleLinkSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={t("editor.commentLinkUrl")}
            autoFocus
            className="min-w-0 flex-1 rounded-sm border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
          />
          <button
            type="submit"
            aria-label={t("editor.commentLink")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container transition-[filter] hover:brightness-110"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={() => setLinkOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
          >
            <X className="size-4" />
          </button>
        </form>
      )}

      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onSelect={captureSelection}
        onKeyUp={captureSelection}
        onClick={captureSelection}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={4}
        autoFocus
        className="w-full resize-none rounded-sm border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
      />

      <div className="flex items-center">
        {initialValue.trim() !== "" && (
          <button
            type="button"
            onClick={() => onSave("")}
            className="flex h-12 items-center rounded-full px-4 font-label-lg text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
          >
            {t("editor.commentClear")}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="ml-auto flex h-12 items-center rounded-full bg-primary-container px-5 font-label-lg text-on-primary-container transition-[filter] hover:brightness-110"
        >
          {hasChanges ? t("editor.commentDone") : t("editor.commentClose")}
        </button>
      </div>
    </div>
  );
}
