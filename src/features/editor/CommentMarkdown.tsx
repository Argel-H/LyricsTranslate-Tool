import { useMemo } from "react";
import { createPortal } from "react-dom";
import MarkdownIt from "markdown-it";
import markdownItMark from "markdown-it-mark";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { useLinkTooltip } from "@/hooks/useLinkTooltip";

// html:true keeps the <u> underline syntax; DOMPurify sanitizes any raw HTML below.
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
}).use(markdownItMark);

const ALLOWED_TAGS = [
  "u",
  "mark",
  "a",
  "strong",
  "em",
  "p",
  "br",
  "code",
  "pre",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "del",
  "sub",
  "sup",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

// Blocks javascript:/data: URIs while allowing http/https/mailto/tel.
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i;

// Hardened links: new tab, noopener.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export interface CommentMarkdownProps {
  markdown: string;
  className?: string;
}

export function CommentMarkdown({ markdown, className }: CommentMarkdownProps) {
  const html = useMemo(
    () =>
      DOMPurify.sanitize(md.render(markdown), {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOWED_URI_REGEXP,
      }),
    [markdown],
  );

  const { tooltip, handleMouseMove, handleMouseLeave } = useLinkTooltip();

  return (
    <>
      <div
        className={cn("comment-markdown", className)}
        dangerouslySetInnerHTML={{ __html: html }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[300] max-w-[320px] rounded-lg bg-surface-container-high px-2.5 py-1 text-xs text-on-surface shadow-lg border border-outline-variant/20"
            style={{
              left: tooltip.left,
              top: tooltip.top,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
          >
            {tooltip.url}
          </div>,
          document.body,
        )}
    </>
  );
}
