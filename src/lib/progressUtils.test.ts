import { describe, it, expect } from 'vitest';
import { calculateLyricsProgress } from './progressUtils';
import { PROJECT_STATUS } from './constants';

describe('calculateLyricsProgress', () => {
  it('returns 0 progress for empty lyrics', () => {
    const result = calculateLyricsProgress({});
    expect(result.progress).toBe(0);
    expect(result.status).toBe(PROJECT_STATUS.IN_PROGRESS);
  });

  it('returns 100 when all lines are translated', () => {
    const lyrics = {
      lrc_00: { time_start: '00:00.00', time_end: '00:03.00', lyric: 'Hello', translation: 'Hola', comment: '' },
      lrc_01: { time_start: '00:03.00', time_end: '00:06.00', lyric: 'World', translation: 'Mundo', comment: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(100);
    expect(result.status).toBe(PROJECT_STATUS.IN_REVIEW);
  });

  it('returns 50 when half the lines are translated', () => {
    const lyrics = {
      lrc_00: { time_start: '00:00.00', time_end: '00:03.00', lyric: 'Hello', translation: 'Hola', comment: '' },
      lrc_01: { time_start: '00:03.00', time_end: '00:06.00', lyric: 'World', translation: '', comment: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(50);
    expect(result.status).toBe(PROJECT_STATUS.IN_PROGRESS);
  });

  it('returns IN_REVIEW status when progress is 100%', () => {
    const lyrics = {
      lrc_00: { time_start: '00:00.00', time_end: '00:03.00', lyric: 'Hello', translation: 'Hola', comment: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.status).toBe(PROJECT_STATUS.IN_REVIEW);
  });

  it('returns IN_PROGRESS status when progress is below 100%', () => {
    const lyrics = {
      lrc_00: { time_start: '00:00.00', time_end: '00:03.00', lyric: 'Hello', translation: 'Hola', comment: '' },
      lrc_01: { time_start: '00:03.00', time_end: '00:06.00', lyric: 'World', translation: '', comment: '' },
      lrc_02: { time_start: '00:06.00', time_end: '00:09.00', lyric: 'Test', translation: '', comment: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(33);
    expect(result.status).toBe(PROJECT_STATUS.IN_PROGRESS);
  });
});
