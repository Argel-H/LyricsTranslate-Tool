// Pure helpers for wrapping a textarea selection in comment markdown markers.

export type CommentStyle =
  | "bold"
  | "italic"
  | "underline"
  | "highlight"
  | "link";

export interface ApplyStyleResult {
  /** The full text after applying the style. */
  text: string;
  /** The caret/selection start to restore after applying. */
  selectionStart: number;
  /** The caret/selection end to restore after applying. */
  selectionEnd: number;
}

const STYLE_MARKERS: Record<
  Exclude<CommentStyle, "link">,
  [open: string, close: string]
> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  underline: ["<u>", "</u>"],
  highlight: ["==", "=="],
};

const DEFAULT_LINK_LABEL = "text";
const DEFAULT_LINK_URL = "https://";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function applyCommentStyle(
  text: string,
  start: number,
  end: number,
  style: CommentStyle,
  linkUrl?: string,
): ApplyStyleResult {
  const from = clamp(Math.min(start, end), 0, text.length);
  const to = clamp(Math.max(start, end), 0, text.length);

  const selected = text.slice(from, to);

  if (style === "link") {
    const label = selected || DEFAULT_LINK_LABEL;
    const url = linkUrl?.trim() || DEFAULT_LINK_URL;
    const linkText = `[${label}](${url})`;
    return {
      text: text.slice(0, from) + linkText + text.slice(to),
      selectionStart: from + 1,
      selectionEnd: from + 1 + label.length,
    };
  }

  const [open, close] = STYLE_MARKERS[style];
  const wrapped = open + selected + close;
  return {
    text: text.slice(0, from) + wrapped + text.slice(to),
    selectionStart: from + open.length,
    selectionEnd: from + open.length + selected.length,
  };
}

export function isUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(value.trim());
}

export function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url;
  return `${url.slice(0, maxLength)}…`;
}
