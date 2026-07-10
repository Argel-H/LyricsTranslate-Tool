import type { LyricLine } from "@/types/project";

/** Recognized LRC timestamp formats: mm:ss.cs and mm:ss:cs formats */
const LRC_TIMESTAMP_PATTERNS: RegExp[] = [
  /\[(\d{2}:\d{2}\.\d{2,3})\]/,
  /\[(\d{2}:\d{2}:\d{2}\.\d{2,3})\]/,
];

const DEFAULT_TIMESTAMP = "00:00.00";

interface ParsedLrcLine {
  timestamp: string;
  text: string;
}

/**
 * Determines whether an LRC string contains at least one timestamp line.
 * Lines without any timestamp pattern are considered plain text.
 */
function hasTimestamps(lines: string[]): boolean {
  for (const line of lines) {
    for (const pattern of LRC_TIMESTAMP_PATTERNS) {
      if (pattern.test(line)) return true;
    }
  }
  return false;
}

/**
 * Parses raw LRC content (synced or plain) into an array of structured lines.
 * - If the content has LRC timestamps, each line's timestamp is extracted.
 * - If the content is plain text (no timestamps), all lines get "00:00.00".
 * - Empty lines between stanzas are preserved as lines with empty text.
 */
export function parseLrcContent(raw: string): ParsedLrcLine[] {
  const lines = splitPreservingEmptyLines(raw);

  if (hasTimestamps(lines)) {
    return parseSyncedLines(lines);
  }
  return lines.map((text) => ({ timestamp: DEFAULT_TIMESTAMP, text }));
}

/**
 * Splits raw LRC text into lines, preserving intentional empty lines
 * (double newlines indicate a stanza break, replaced with a single blank line).
 */
function splitPreservingEmptyLines(raw: string): string[] {
  return raw.replaceAll("\n\n", "\n \n").split("\n");
}

/**
 * Parses synced (timestamped) LRC lines, extracting timestamps and text.
 * Lines without timestamps are skipped once timestamped lines have been found.
 */
function parseSyncedLines(lines: string[]): ParsedLrcLine[] {
  const result: ParsedLrcLine[] = [];

  for (const line of lines) {
    let matched = false;
    for (const pattern of LRC_TIMESTAMP_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        const text = line.replace(pattern, "").trim();
        result.push({ timestamp: match[1], text: text || " " });
        matched = true;
        break;
      }
    }
    // If no timestamp matched but we've already found timestamped lines,
    // this is a non-timestamped line (e.g. blank stanza break) — skip it.
    if (!matched && result.length === 0) {
      // No timestamps found at all yet — this shouldn't happen because
      // hasTimestamps() gates entry to this function, but handle gracefully.
    }
  }

  return result;
}

/**
 * Infers a reasonable time_end for the last line in a synced LRC.
 * Defaults to time_start + 3 seconds.
 */
function inferEndTimestamp(timeStart: string): string {
  const match = timeStart.match(/^(\d{2}):(\d{2})\.(\d{2})$/);
  if (!match) return timeStart;
  let ms =
    parseInt(match[1]!) * 60000 +
    parseInt(match[2]!) * 1000 +
    parseInt(match[3]!) * 10;
  ms += 3000; // default 3 second duration
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Converts an array of parsed LRC lines into the Map<string, LyricLine>
 * format used by the editor, generating sequential keys like "lrc_00", "lrc_01", etc.
 *
 * For synced LRCs, each line's time_end is set to the next line's timestamp.
 * The last line's time_end is inferred (~3s duration) via inferEndTimestamp.
 */
export function toLyricLineMap(parsedLines: ParsedLrcLine[]): Map<string, LyricLine> {
  const map = new Map<string, LyricLine>();

  parsedLines.forEach((line, index) => {
    const key = `lrc_${String(index).padStart(2, "0")}`;
    const nextLine = parsedLines[index + 1];
    const timeEnd = nextLine
      ? nextLine.timestamp
      : inferEndTimestamp(line.timestamp);

    map.set(key, {
      time_start: line.timestamp,
      time_end: timeEnd,
      lyric: line.text === " " ? line.text : line.text.trim(),
      translation: "",
      comment: "",
    });
  });

  return map;
}

/**
 * Legacy wrapper — parses raw lyrics string into a Map.
 * Kept for backward compatibility with existing callers.
 * Returns null if the input produces no parsed lines.
 */
export function processLyricsMap(lyricsString: string): Map<string, LyricLine> | null {
  const lines = parseLrcContent(lyricsString);
  if (lines.length === 0) return null;
  return toLyricLineMap(lines);
}
