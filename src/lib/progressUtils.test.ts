import { describe, it, expect } from 'vitest';
import { calculateLyricsProgress } from './progressUtils';
import { PROJECT_STATUS } from './config/constants';

describe('calculateLyricsProgress', () => {
  it('returns NOT_STARTED for empty lyrics (0%)', () => {
    const result = calculateLyricsProgress({});
    expect(result.progress).toBe(0);
    expect(result.status).toBe(PROJECT_STATUS.NOT_STARTED);
  });

  it('returns IN_REVIEW when all lines are translated (100%)', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: 'Hello', translation: 'Hola' },
      lrc_01: { time_start: 3000, time_end: 6000, lyric: 'World', translation: 'Mundo' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(100);
    expect(result.status).toBe(PROJECT_STATUS.IN_REVIEW);
  });

  it('returns IN_PROGRESS when partially translated (50%)', () => {
    const lyrics = {
      lrc_00: { time_start: 0, time_end: 3000, lyric: 'Hello', translation: 'Hola' },
      lrc_01: { time_start: 3000, time_end: 6000, lyric: 'World', translation: '' },
    };
    const result = calculateLyricsProgress(lyrics);
    expect(result.progress).toBe(50);
    expect(result.status).toBe(PROJECT_STATUS.IN_PROGRESS);
  });
});
