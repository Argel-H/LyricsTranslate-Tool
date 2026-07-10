import { describe, it, expect } from 'vitest';
import { parseTimestampToMilliseconds, formatMillisecondsToTimestamp } from './timeUtils';

describe('parseTimestampToMilliseconds', () => {
  it('converts "01:30.50" correctly to 90500ms', () => {
    expect(parseTimestampToMilliseconds('01:30.50')).toBe(90500);
  });

  it('handles zero timestamp', () => {
    expect(parseTimestampToMilliseconds('00:00.00')).toBe(0);
  });

  it('handles empty string', () => {
    expect(parseTimestampToMilliseconds('')).toBe(0);
  });

  it('converts minutes and seconds only', () => {
    expect(parseTimestampToMilliseconds('02:15.00')).toBe(135000);
  });

  it('returns the number as-is when given a number', () => {
    expect(parseTimestampToMilliseconds(9590)).toBe(9590);
    expect(parseTimestampToMilliseconds(0)).toBe(0);
    expect(parseTimestampToMilliseconds(148840)).toBe(148840);
  });
});

describe('formatMillisecondsToTimestamp', () => {
  it('converts 90500ms correctly to "01:30.50"', () => {
    expect(formatMillisecondsToTimestamp(90500)).toBe('01:30.50');
  });

  it('handles zero', () => {
    expect(formatMillisecondsToTimestamp(0)).toBe('00:00.00');
  });

  it('clamps negative values to "00:00.00"', () => {
    expect(formatMillisecondsToTimestamp(-100)).toBe('00:00.00');
  });

  it('converts exact minute boundary', () => {
    expect(formatMillisecondsToTimestamp(60000)).toBe('01:00.00');
  });
});
