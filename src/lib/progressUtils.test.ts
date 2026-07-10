import { describe, it, expect } from 'vitest';
import { calculateLyricsProgress } from './progressUtils';
import { PROJECT_STATUS } from './constants';

describe('calculateLyricsProgress', () => {
  it('returns not-started status for empty lyrics', () => {
    const result = calculateLyricsProgress({});
    expect(result.progress).toBe(0);
    expect(result.status).toBe(PROJECT_STATUS.NOT_STARTED);
  });

  it('returns not-started status when all lyric lines are empty', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: '', translation: '' },
      lrc_01: { time_start: 3000, time_end: 6000, lyric: '   ', translation: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(0);
    expect(result.status).toBe(PROJECT_STATUS.NOT_STARTED);
  });

  it('returns 100 when all lines are translated', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: 'Hello', translation: 'Hola' },
      lrc_01: { time_start: 3000, time_end: 6000, lyric: 'World', translation: 'Mundo' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(100);
    expect(result.status).toBe(PROJECT_STATUS.IN_REVIEW);
  });

  it('returns 50 when half the lines are translated', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: 'Hello', translation: 'Hola' },
      lrc_01: { time_start: 3000, time_end: 6000, lyric: 'World', translation: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(50);
    expect(result.status).toBe(PROJECT_STATUS.IN_PROGRESS);
  });

  it('returns IN_REVIEW status when progress is 100%', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: 'Hello', translation: 'Hola' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.status).toBe(PROJECT_STATUS.IN_REVIEW);
  });

  it('returns IN_PROGRESS status when progress is below 100%', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: 'Hello', translation: 'Hola' },
      lrc_01: { time_start: 3000, time_end: 6000, lyric: 'World', translation: '' },
      lrc_02: { time_start: 6000, time_end: 9000, lyric: 'Test', translation: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(33);
    expect(result.status).toBe(PROJECT_STATUS.IN_PROGRESS);
  });

  it('returns NOT_STARTED when 0% of translatable lines are translated', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: 'Hello', translation: '' },
      lrc_01: { time_start: 3000, time_end: 6000, lyric: 'World', translation: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(0);
    expect(result.status).toBe(PROJECT_STATUS.NOT_STARTED);
  });
});
