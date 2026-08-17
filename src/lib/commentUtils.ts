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
