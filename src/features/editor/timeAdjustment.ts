import type { LyricLine } from "@/types/project";
import { getSortedLyricLines } from "@/lib/timeUtils";

export type TimeField = "time_start" | "time_end";
export const SNAP_STEP_MS = 10;

export interface TimeBounds {
  min: number;
  max: number;
}

export function getTimeBounds(
  lyrics: Record<string, LyricLine>,
  key: string,
  field: TimeField,
  minGapMs: number,
): TimeBounds | null {
  const line = lyrics[key];
  if (!line) return null;

  const sorted = getSortedLyricLines(lyrics);
  const index = sorted.findIndex((entry) => entry.key === key);
  if (index === -1) return null;

  const previousLine = sorted[index - 1];
  const nextLine = sorted[index + 1];

  if (field === "time_start") {
    return {
      min: previousLine?.timeEndMs ?? 0,
      max: line.time_end - minGapMs,
    };
  }

  return {
    min: line.time_start + minGapMs,
    max: nextLine?.timeMs ?? Infinity,
  };
}

export interface SnappedTime {
  value: number;
  changed: boolean;
}

export interface SnapTimeArgs {
  lyrics: Record<string, LyricLine>;
  key: string;
  field: TimeField;
  targetMs: number;
  minGapMs: number;
}

export function getSnappedTime({
  lyrics,
  key,
  field,
  targetMs,
  minGapMs,
}: SnapTimeArgs): SnappedTime | null {
  const line = lyrics[key];
  const bounds = getTimeBounds(lyrics, key, field, minGapMs);
  if (!line || !bounds) return null;

  const boundsAreInverted = bounds.min > bounds.max;
  if (boundsAreInverted) return { value: line[field], changed: false };

  const roundedTarget = Math.round(targetMs / SNAP_STEP_MS) * SNAP_STEP_MS;
  const withinBounds = Math.min(Math.max(roundedTarget, bounds.min), bounds.max);
  const value = Math.max(0, withinBounds);
  const valueChanged = value !== line[field];

  return { value, changed: valueChanged };
}

export interface SteppedTime {
  value: number;
  changed: boolean;
}

export interface StepTimeArgs {
  lyrics: Record<string, LyricLine>;
  key: string;
  field: TimeField;
  direction: 1 | -1;
  stepMs: number;
  minGapMs: number;
}

export function getSteppedTime({
  lyrics,
  key,
  field,
  direction,
  stepMs,
  minGapMs,
}: StepTimeArgs): SteppedTime | null {
  const line = lyrics[key];
  const bounds = getTimeBounds(lyrics, key, field, minGapMs);
  if (!line || !bounds) return null;

  const boundsAreInverted = bounds.min > bounds.max;
  if (boundsAreInverted) return { value: line[field], changed: false };

  const stepped = line[field] + direction * stepMs;
  const value = direction > 0
    ? Math.min(stepped, bounds.max)
    : Math.max(stepped, bounds.min);
  const movedInDirection = direction > 0 ? value > line[field] : value < line[field];

  return { value: movedInDirection ? value : line[field], changed: movedInDirection };
}
