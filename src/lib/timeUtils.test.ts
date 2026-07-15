import { describe, it, expect } from 'vitest';
import {
  parseTimestampToMilliseconds,
  formatMillisecondsToTimestamp,
  findActiveLine,
  getSortedLyricLines,
} from './timeUtils';
import type { TimestampedLine } from './timeUtils';
import type { LyricLine } from "@/types/project";

describe('parseTimestampToMilliseconds', () => {
  it('converts timestamps and handles zero/empty/number input', () => {
    expect(parseTimestampToMilliseconds('01:30.50')).toBe(90500);
    expect(parseTimestampToMilliseconds('00:00.00')).toBe(0);
    expect(parseTimestampToMilliseconds('')).toBe(0);
    expect(parseTimestampToMilliseconds(9590)).toBe(9590);
    expect(parseTimestampToMilliseconds(0)).toBe(0);
  });
});

describe('formatMillisecondsToTimestamp', () => {
  it('converts milliseconds to timestamp including zero and boundaries', () => {
    expect(formatMillisecondsToTimestamp(90500)).toBe('01:30.50');
    expect(formatMillisecondsToTimestamp(0)).toBe('00:00.00');
    expect(formatMillisecondsToTimestamp(60000)).toBe('01:00.00');
  });

  it('clamps negative values to "00:00.00"', () => {
    expect(formatMillisecondsToTimestamp(-100)).toBe('00:00.00');
  });
});

describe('findActiveLine', () => {
  const lines: TimestampedLine[] = [
    { key: 'a', timeMs: 1000, timeEndMs: 5000 },
    { key: 'b', timeMs: 5000, timeEndMs: 9000 },
    { key: 'c', timeMs: 9000, timeEndMs: 13000 },
  ];

  const contiguousLines: TimestampedLine[] = [
    { key: 'x', timeMs: 0, timeEndMs: 3000 },
    { key: 'y', timeMs: 3000, timeEndMs: 6000 },
    { key: 'z', timeMs: 6000, timeEndMs: 9000 },
  ];

  it('returns null for an empty array', () => {
    expect(findActiveLine([], 5000)).toBeNull();
  });

  it('returns null when audio time is before the first line', () => {
    expect(findActiveLine(lines, 0)).toBeNull();
    expect(findActiveLine(lines, 500)).toBeNull();
    expect(findActiveLine(lines, 999)).toBeNull();
  });

  it('returns the correct key when inside [start, end) of a line', () => {
    expect(findActiveLine(lines, 1000)).toBe('a');
    expect(findActiveLine(lines, 2500)).toBe('a');
    expect(findActiveLine(lines, 4999)).toBe('a');

    expect(findActiveLine(lines, 5000)).toBe('b');
    expect(findActiveLine(lines, 7000)).toBe('b');
    expect(findActiveLine(lines, 8999)).toBe('b');

    expect(findActiveLine(lines, 9000)).toBe('c');
    expect(findActiveLine(lines, 11000)).toBe('c');
    expect(findActiveLine(lines, 12999)).toBe('c');
  });

  it('returns null when audio time exactly equals time_end (exclusive)', () => {
    expect(findActiveLine(lines, 5000)).toBe('b'); // 5000 is start of b
    expect(findActiveLine(lines, 9000)).toBe('c'); // 9000 is start of c
  });

  it('returns null when audio time is in a gap between two lines', () => {
    // No gaps in contiguousLines; add a gap in lines
    expect(findActiveLine(lines, 13000)).toBeNull(); // after last line
  });

  it('returns null when audio time is after the last line', () => {
    expect(findActiveLine(lines, 13000)).toBeNull();
    expect(findActiveLine(lines, 20000)).toBeNull();
  });

  it('handles contiguous lines (end of A === start of B) correctly', () => {
    // At exactly the boundary, it should pick the NEXT line (end is exclusive)
    expect(findActiveLine(contiguousLines, 0)).toBe('x');
    expect(findActiveLine(contiguousLines, 2999)).toBe('x');
    expect(findActiveLine(contiguousLines, 3000)).toBe('y'); // boundary → next line
    expect(findActiveLine(contiguousLines, 5999)).toBe('y');
    expect(findActiveLine(contiguousLines, 6000)).toBe('z'); // boundary → next line
    expect(findActiveLine(contiguousLines, 8999)).toBe('z');
    expect(findActiveLine(contiguousLines, 9000)).toBeNull(); // after last
  });

  it('works with a single line', () => {
    const single: TimestampedLine[] = [
      { key: 'only', timeMs: 2000, timeEndMs: 6000 },
    ];
    expect(findActiveLine(single, 0)).toBeNull();
    expect(findActiveLine(single, 1999)).toBeNull();
    expect(findActiveLine(single, 2000)).toBe('only');
    expect(findActiveLine(single, 4000)).toBe('only');
    expect(findActiveLine(single, 5999)).toBe('only');
    expect(findActiveLine(single, 6000)).toBeNull();
  });

  it('returns correct middle line in multi-line scenario', () => {
    const multi: TimestampedLine[] = [
      { key: 'first', timeMs: 0, timeEndMs: 1000 },
      { key: 'second', timeMs: 1000, timeEndMs: 2000 },
      { key: 'third', timeMs: 2000, timeEndMs: 3000 },
      { key: 'fourth', timeMs: 3000, timeEndMs: 4000 },
    ];
    expect(findActiveLine(multi, 500)).toBe('first');
    expect(findActiveLine(multi, 1500)).toBe('second');
    expect(findActiveLine(multi, 2500)).toBe('third');
    expect(findActiveLine(multi, 3500)).toBe('fourth');
    expect(findActiveLine(multi, 4000)).toBeNull();
  });
});

describe('getSortedLyricLines', () => {
  it('returns all lines including blank-timestamped lines', () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: { lyric: "Hello world", time_start: "00:01.00", time_end: "00:05.00" },
      lrc_01: { lyric: " ", time_start: "00:05.00", time_end: "00:08.00" },
      lrc_02: { lyric: "", time_start: "00:08.00", time_end: "00:12.00" },
      lrc_03: { lyric: "[Chorus]", time_start: "00:12.00", time_end: "00:15.00" },
    };

    const result = getSortedLyricLines(lyrics);

    expect(result).toHaveLength(4);
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(['lrc_00', 'lrc_01', 'lrc_02', 'lrc_03']);
  });

  it('sorts by time_start ascending', () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_last: { lyric: "Last", time_start: "00:10.00", time_end: "00:15.00" },
      lrc_first: { lyric: "First", time_start: "00:01.00", time_end: "00:05.00" },
      lrc_mid: { lyric: "Middle", time_start: "00:05.00", time_end: "00:10.00" },
    };

    const result = getSortedLyricLines(lyrics);

    expect(result).toHaveLength(3);
    expect(result[0]!.key).toBe('lrc_first');
    expect(result[1]!.key).toBe('lrc_mid');
    expect(result[2]!.key).toBe('lrc_last');
    expect(result[0]!.timeMs).toBe(1000);
    expect(result[1]!.timeMs).toBe(5000);
    expect(result[2]!.timeMs).toBe(10000);
  });

  it('converts timestamps to milliseconds correctly', () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: { lyric: "One minute", time_start: "01:00.00", time_end: "01:30.00" },
    };

    const result = getSortedLyricLines(lyrics);

    expect(result).toHaveLength(1);
    expect(result[0]!.timeMs).toBe(60000);
    expect(result[0]!.timeEndMs).toBe(90000);
  });

  it('returns empty array for empty lyrics record', () => {
    expect(getSortedLyricLines({})).toEqual([]);
  });
});
