import { describe, it, expect } from 'vitest';
import { parseTimestampToMilliseconds, formatMillisecondsToTimestamp } from './timeUtils';

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
