import type { ParsedLrcLine } from "./lyricsParser";
import { validateLrcContent, parseLrcContent } from "./lyricsParser";
import { validateSrtContent, parseSrtContent } from "./srtParser";

export type LyricsFormat = "lrc" | "srt" | "plain" | "unknown";

export interface ValidationResult {
  valid: boolean;
  format: LyricsFormat;
  error?: string;
  lines?: ParsedLrcLine[];
  lineCount: number;
  isSynced: boolean;
}

/**
 * Auto-detects the lyrics format from raw text.
 * - If content contains SRT-style "HH:MM:SS,mmm --> HH:MM:SS,mmm" patterns → "srt"
 * - Else if content contains LRC-style "[mm:ss.xx]" or similar timestamp pattern → "lrc"
 * - Else if content is non-empty → "plain"
 * - Else → "unknown"
 */
function detectFormat(raw: string): LyricsFormat {
  if (!raw || !raw.trim()) return "unknown";

  if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(raw)) {
    return "srt";
  }

  if (/\[\d{2}:\d{2}[.:]\d{2,3}\]/.test(raw)) {
    return "lrc";
  }

  if (raw.trim().length > 0) return "plain";

  return "unknown";
}

/**
 * Detects the format of raw lyrics content, validates it, and optionally parses it.
 *
 * - "lrc" → delegates to validateLrcContent (lyricsParser)
 * - "srt" → delegates to validateSrtContent + parseSrtContent (srtParser)
 * - "plain" → treats as plain text (all lines with timestamp=0, always valid)
 * - "unknown" → returns invalid result
 *
 * @returns ValidationResult with format, validity, optional error, parsed lines, line count, and sync status
 */
export function validateAndParseLyrics(raw: string): ValidationResult {
  const format = detectFormat(raw);

  if (format === "unknown") {
    return {
      valid: false,
      format: "unknown",
      error: "No lyrics content provided",
      lineCount: 0,
      isSynced: false,
    };
  }

  if (format === "srt") {
    const srtValidation = validateSrtContent(raw);
    if (!srtValidation.valid) {
      return {
        valid: false,
        format: "srt",
        error: srtValidation.error,
        lineCount: 0,
        isSynced: false,
      };
    }
    const lines = parseSrtContent(raw);
    return {
      valid: true,
      format: "srt",
      lines,
      lineCount: lines.length,
      isSynced: lines.length > 0 && lines.some((l) => typeof l.timestamp === "number" && l.timestamp > 0),
    };
  }

  if (format === "lrc") {
    const lrcValidation = validateLrcContent(raw);
    if (!lrcValidation.valid) {
      return {
        valid: false,
        format: "lrc",
        error: lrcValidation.error,
        lineCount: 0,
        isSynced: false,
      };
    }
    return {
      valid: true,
      format: "lrc",
      lines: lrcValidation.lines,
      lineCount: lrcValidation.lines?.length ?? 0,
      isSynced: lrcValidation.lines?.some((l) => typeof l.timestamp === "string" && l.timestamp !== 0) ?? false,
    };
  }

  // format === "plain"
  const textLines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lines: ParsedLrcLine[] = textLines.map((text) => ({
    timestamp: 0,
    text,
  }));

  return {
    valid: true,
    format: "plain",
    lines,
    lineCount: lines.length,
    isSynced: false,
  };
}
