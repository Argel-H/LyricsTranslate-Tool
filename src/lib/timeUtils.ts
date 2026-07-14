import type { LyricLine } from "@/types/project";

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_SECOND = 1_000;

export function parseTimestampToMilliseconds(timestamp: string | number): number {
  if (typeof timestamp === "number") return timestamp;
  const [minutes, rest] = timestamp.split(":");
  if (!rest) return 0;
  const [seconds, centiseconds] = rest.split(".");
  const mins = parseInt(minutes ?? "0", 10);
  const secs = parseInt(seconds ?? "0", 10);
  const cs = parseInt(centiseconds ?? "0", 10);
  return mins * MILLISECONDS_PER_MINUTE + secs * MILLISECONDS_PER_SECOND + cs * 10;
}

export function formatMillisecondsToTimestamp(milliseconds: number): string {
  const clamped = Math.max(0, milliseconds);
  const minutes = Math.floor(clamped / MILLISECONDS_PER_MINUTE);
  const seconds = Math.floor((clamped % MILLISECONDS_PER_MINUTE) / MILLISECONDS_PER_SECOND);
  const centiseconds = Math.floor((clamped % MILLISECONDS_PER_SECOND) / 10);
  return [
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":") + "." + String(centiseconds).padStart(2, "0");
}

export interface TimestampedLine {
  key: string;
  timeMs: number;
  timeEndMs: number;
}

/**
 * Returns lyric lines sorted by timestamp, with millisecond values precomputed.
 * Filters out lines with empty lyric text (instrumental breaks with spaces).
 */
export function getSortedLyricLines(lyrics: Record<string, LyricLine>): TimestampedLine[] {
  return Object.entries(lyrics)
    .filter(([, line]) => {
      const text = line.lyric?.trim() ?? "";
      return text.length > 0 && text !== " ";
    })
    .map(([key, line]) => ({
      key,
      timeMs: parseTimestampToMilliseconds(line.time_start),
      timeEndMs: parseTimestampToMilliseconds(line.time_end),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Finds the active lyric line for a given audio time using [timeMs, timeEndMs) intervals.
 *
 * Returns the key of the line where `timeMs <= audioTimeMs < timeEndMs`, or `null` if
 * the audio time falls outside all intervals (before the first line, in a gap between
 * lines, or after the last line ends).
 *
 * Uses binary search for O(log n) efficiency on sorted lines.
 *
 * @param sortedLines - Lyric lines sorted by `timeMs` ascending
 * @param audioTimeMs - Current audio time in milliseconds
 * @returns The key of the active line, or `null` if no line covers this time
 */
export function findActiveLine(
  sortedLines: TimestampedLine[],
  audioTimeMs: number,
): string | null {
  if (sortedLines.length === 0) return null;

  // Binary search: find the last index where timeMs <= audioTimeMs
  let low = 0;
  let high = sortedLines.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedLines[mid]!.timeMs <= audioTimeMs) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // `high` is now the greatest index with timeMs <= audioTimeMs
  // If high === -1, audioTimeMs precedes the first line
  if (high < 0) return null;

  // Verify audioTimeMs is strictly within the [start, end) interval
  const candidate = sortedLines[high]!;
  if (audioTimeMs < candidate.timeEndMs) {
    return candidate.key;
  }

  return null;
}
