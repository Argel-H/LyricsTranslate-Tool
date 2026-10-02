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

export function getSortedLyricLines(lyrics: Record<string, LyricLine>): TimestampedLine[] {
  return Object.entries(lyrics)
    .map(([key, line]) => ({
      key,
      timeMs: parseTimestampToMilliseconds(line.time_start),
      timeEndMs: parseTimestampToMilliseconds(line.time_end),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);
}

export function findActiveLine(
  sortedLines: TimestampedLine[],
  audioTimeMs: number,
): string | null {
  if (sortedLines.length === 0) return null;
  if (audioTimeMs < sortedLines[0]!.timeMs) return sortedLines[0]!.key;

  let low = 0;
  let high = sortedLines.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (sortedLines[middle]!.timeMs <= audioTimeMs) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const line = sortedLines[high]!;
  const isInsideLine = audioTimeMs < line.timeEndMs;
  return isInsideLine ? line.key : null;
}

export const ACTIVE_LINE_TOLERANCE_MS = 30;

export function findStableActiveLine(
  sortedLines: TimestampedLine[],
  audioTimeMs: number,
  currentKey: string | null,
  toleranceMs: number,
): string | null {
  const candidateKey = findActiveLine(sortedLines, audioTimeMs);
  if (currentKey === null || candidateKey === currentKey) return candidateKey;

  const currentLine = sortedLines.find((line) => line.key === currentKey);
  if (!currentLine) return candidateKey;

  const withinBoundaryTolerance =
    audioTimeMs >= currentLine.timeMs - toleranceMs &&
    audioTimeMs < currentLine.timeEndMs + toleranceMs;

  return withinBoundaryTolerance ? currentKey : candidateKey;
}
