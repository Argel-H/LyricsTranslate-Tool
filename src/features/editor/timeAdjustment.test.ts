import { describe, it, expect } from "vitest";
import type { LyricLine } from "@/types/project";
import {
  getSnappedTime,
  getTimeBounds,
  SNAP_STEP_MS,
  type TimeField,
} from "./timeAdjustment";

const MIN_GAP_MS = 100;

function makeLine(
  time_start: number,
  time_end: number,
  lyric = "",
  translation = "",
): LyricLine {
  return { time_start, time_end, lyric, translation };
}

function lyricsOf(
  entries: Record<string, LyricLine>,
): Record<string, LyricLine> {
  return entries;
}

function snap(
  lyrics: Record<string, LyricLine>,
  key: string,
  field: TimeField,
  targetMs: number,
) {
  return getSnappedTime({
    lyrics,
    key,
    field,
    targetMs,
    minGapMs: MIN_GAP_MS,
  });
}

describe("getTimeBounds", () => {
  it("returns null for an unknown key", () => {
    const lyrics = lyricsOf({ a: makeLine(0, 1000) });
    expect(getTimeBounds(lyrics, "missing", "time_start", MIN_GAP_MS)).toBeNull();
  });

  it("uses 0 as the lower bound for the first line's time_start", () => {
    const lyrics = lyricsOf({ a: makeLine(1000, 5000) });
    expect(getTimeBounds(lyrics, "a", "time_start", MIN_GAP_MS)).toEqual({
      min: 0,
      max: 4900,
    });
  });

  it("uses Infinity as the upper bound for the last line's time_end", () => {
    const lyrics = lyricsOf({ a: makeLine(1000, 5000) });
    expect(getTimeBounds(lyrics, "a", "time_end", MIN_GAP_MS)).toEqual({
      min: 1100,
      max: Infinity,
    });
  });

  it("resolves neighbours by temporal order, not key order", () => {
    const lyrics = lyricsOf({
      lrc_00: makeLine(3000, 4000),
      lrc_01: makeLine(1000, 2000),
    });

    expect(getTimeBounds(lyrics, "lrc_00", "time_start", MIN_GAP_MS)).toEqual({
      min: 2000,
      max: 3900,
    });
    expect(getTimeBounds(lyrics, "lrc_01", "time_end", MIN_GAP_MS)).toEqual({
      min: 1100,
      max: 3000,
    });
  });
});

describe("getSnappedTime", () => {
  it("rounds the target to the nearest 10 ms", () => {
    const lyrics = lyricsOf({ a: makeLine(0, 100000) });
    expect(SNAP_STEP_MS).toBe(10);
    expect(snap(lyrics, "a", "time_start", 1234)?.value).toBe(1230);
    expect(snap(lyrics, "a", "time_start", 1236)?.value).toBe(1240);
  });

  it("clamps time_start to 0 for the first line", () => {
    const lyrics = lyricsOf({ a: makeLine(1000, 5000) });
    expect(snap(lyrics, "a", "time_start", -50)?.value).toBe(0);
  });

  it("clamps time_start by the previous line's time_end", () => {
    const lyrics = lyricsOf({
      first: makeLine(0, 2000),
      second: makeLine(3000, 6000),
    });
    expect(snap(lyrics, "second", "time_start", 1500)?.value).toBe(2000);
  });

  it("clamps time_end by the next line's time_start", () => {
    const lyrics = lyricsOf({
      first: makeLine(0, 2000),
      second: makeLine(3000, 6000),
    });
    expect(snap(lyrics, "first", "time_end", 4500)?.value).toBe(3000);
  });

  it("clamps the last line's time_end only by its own gap (max Infinity)", () => {
    const lyrics = lyricsOf({ a: makeLine(1000, 5000) });
    expect(snap(lyrics, "a", "time_end", 999999)?.value).toBe(1000000);
    expect(snap(lyrics, "a", "time_end", 1050)?.value).toBe(1100);
  });

  it("returns changed=false when the computed value equals the current field", () => {
    const lyrics = lyricsOf({ a: makeLine(1000, 5000) });
    expect(snap(lyrics, "a", "time_start", 1000)).toEqual({
      value: 1000,
      changed: false,
    });
  });

  it("uses the correct temporal neighbour when keys are not in time order", () => {
    const lyrics = lyricsOf({
      lrc_00: makeLine(3000, 4000),
      lrc_01: makeLine(1000, 2000),
    });
    expect(snap(lyrics, "lrc_00", "time_start", 1500)?.value).toBe(2000);
  });

  it("never moves when bounds are inverted (min > max)", () => {
    const lyrics = lyricsOf({
      a: makeLine(0, 5000),
      b: makeLine(4000, 4100),
    });
    expect(snap(lyrics, "b", "time_start", 4200)).toEqual({
      value: 4000,
      changed: false,
    });
  });

  it("returns null for an unknown key", () => {
    const lyrics = lyricsOf({ a: makeLine(0, 1000) });
    expect(snap(lyrics, "missing", "time_start", 500)).toBeNull();
  });
});
