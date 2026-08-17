import type { LyricLine } from "@/types/project";
import { trimToUndefined } from "./stringUtils";

/** Maps trimmed original lyric text → comment (first non-empty in time order wins). */
export function buildCommentIndex(lyrics: Record<string, LyricLine>): Map<string, string> {
  const index = new Map<string, string>();

  Object.values(lyrics)
    .sort((a, b) => a.time_start - b.time_start)
    .forEach((line) => {
      const text = line.lyric.trim();
      if (!text) return;
      if (index.has(text)) return;
      const comment = trimToUndefined(line.comment);
      if (comment) index.set(text, comment);
    });

  return index;
}

/**
 * Returns a new lyrics record where every line sharing `targetText`
 * (whitespace-insensitively) gets `comment`, normalized via `trimToUndefined`.
 * Lines that do not match are carried over by reference; the input is not mutated.
 */
export function applyCommentToMatchingLines(
  lyrics: Record<string, LyricLine>,
  targetText: string,
  comment: string,
): Record<string, LyricLine> {
  const normalizedTarget = targetText.trim();
  const normalizedComment = trimToUndefined(comment);
  const updated: Record<string, LyricLine> = {};
  for (const [key, line] of Object.entries(lyrics)) {
    if (line.lyric.trim() !== normalizedTarget) {
      updated[key] = line;
      continue;
    }
    updated[key] = { ...line, comment: normalizedComment };
  }
  return updated;
}

export function getCommentForLine(index: Map<string, string>, lyric: string): string | undefined {
  const text = lyric.trim();
  if (!text) return undefined;
  return index.get(text);
}

/** A single aggregated comment entry for the comments drawer. */
export interface CommentEntry {
  /** Key of the first line (in time order) that carries this lyric text. */
  key: string;
  /** Trimmed original lyric text shared by all the lines in this entry. */
  lyric: string;
  /** First non-empty comment (in time order) for this lyric text. */
  comment: string;
  /** 1-based positions (in time-sorted order) of every line sharing this lyric text. */
  lineNumbers: number[];
}

/**
 * Builds a time-ordered list of comments for the comments drawer.
 * Lines are grouped by trimmed original lyric text: repeated text collapses
 * into a single entry whose `lineNumbers` collects all occurrences and whose
 * `comment` is the first non-empty comment in time order. Blank/whitespace-only
 * lyric lines and lines without a comment are excluded.
 */
export function buildCommentList(lyrics: Record<string, LyricLine>): CommentEntry[] {
  const sorted = Object.entries(lyrics).sort(([, a], [, b]) => a.time_start - b.time_start);

  const lineNumbersByText = new Map<string, number[]>();
  const firstKeyByText = new Map<string, string>();
  const commentByText = new Map<string, string>();

  sorted.forEach(([key, line], index) => {
    const text = line.lyric.trim();
    if (!text) return;

    const numbers = lineNumbersByText.get(text) ?? [];
    numbers.push(index + 1);
    lineNumbersByText.set(text, numbers);

    if (!firstKeyByText.has(text)) firstKeyByText.set(text, key);

    const comment = line.comment?.trim();
    if (comment && !commentByText.has(text)) commentByText.set(text, comment);
  });

  return [...commentByText.entries()].map(([text, comment]) => ({
    key: firstKeyByText.get(text)!,
    lyric: text,
    comment,
    lineNumbers: lineNumbersByText.get(text)!,
  }));
}
