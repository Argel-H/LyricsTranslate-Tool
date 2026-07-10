import type { LyricLine } from "@/types/project";

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_SECOND = 1_000;

export function parseTimestampToMilliseconds(timestamp: string): number {
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
 * Binary search for the currently active lyric line given audio time in milliseconds.
 * Returns the key of the line whose timeMs <= audioTimeMs, or null if no such line exists.
 */
export function findActiveLine(
  sortedLines: TimestampedLine[],
  audioTimeMs: number,
): string | null {
  if (sortedLines.length === 0) return null;

  let low = 0;
  let high = sortedLines.length - 1;
  let best = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedLines[mid]!.timeMs <= audioTimeMs) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best >= 0 ? sortedLines[best]!.key : null;
}
