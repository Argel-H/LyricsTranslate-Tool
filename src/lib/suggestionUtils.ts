import type { LyricLine } from "@/types/project";

export interface TranslationSuggestion {
  /** The translated text to suggest */
  text: string;
  /** 1-based line number where the match was found */
  sourceLineNumber: number;
}

/**
 * Finds an existing translation for a given lyric text.
 * Scans all rows for a matching lyric (case-insensitive, trimmed)
 * that already has a non-empty translation.
 * Returns null if no match found.
 */
export function findExistingTranslation(
  currentLyric: string,
  currentKey: string,
  allLyrics: Record<string, LyricLine>,
): TranslationSuggestion | null {
  const normalizedCurrent = currentLyric.trim().toLowerCase();
  if (!normalizedCurrent) return null;

  let lineNumber = 0;
  for (const [key, line] of Object.entries(allLyrics)) {
    lineNumber++;
    if (key === currentKey) continue;
    if (!line.translation?.trim()) continue;
    if ((line.lyric ?? "").trim().toLowerCase() !== normalizedCurrent) continue;

    return { text: line.translation, sourceLineNumber: lineNumber };
  }

  return null;
}

/**
 * Finds ALL existing translations for a given lyric text.
 * Scans all rows for matching lyrics (case-insensitive, trimmed)
 * that already have non-empty translations.
 * Returns an array of unique suggestions (deduplicated by translation text,
 * case-insensitive), sorted by their order of appearance in the lyrics.
 * Returns an empty array if no matches found.
 */
export function findAllTranslations(
  currentLyric: string,
  currentKey: string,
  allLyrics: Record<string, LyricLine>,
): TranslationSuggestion[] {
  const normalizedCurrent = currentLyric.trim().toLowerCase();
  if (!normalizedCurrent) return [];

  const suggestions: TranslationSuggestion[] = [];
  const seen = new Set<string>();
  let lineNumber = 0;

  for (const [key, line] of Object.entries(allLyrics)) {
    lineNumber++;
    if (key === currentKey) continue;
    const translation = line.translation?.trim();
    if (!translation) continue;
    if ((line.lyric ?? "").trim().toLowerCase() !== normalizedCurrent) continue;

    // Deduplicate by translation text (case-insensitive)
    const normalizedTranslation = translation.toLowerCase();
    if (seen.has(normalizedTranslation)) continue;
    seen.add(normalizedTranslation);

    suggestions.push({ text: translation, sourceLineNumber: lineNumber });
  }

  return suggestions;
}
