import { describe, it, expect } from 'vitest';
import { processLyricsMap } from './lyricsParser';

describe('processLyricsMap', () => {
  it('parses synced lyrics with timestamps', () => {
    const input = '[00:01.00]Line one\n[00:04.50]Line two\n[00:08.00]Line three';
    const result = processLyricsMap(input);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(3);
    expect(result!.get('lrc_00')?.time_start).toBe('00:01.00');
    expect(result!.get('lrc_00')?.lyric).toBe('Line one');
    expect(result!.get('lrc_01')?.time_start).toBe('00:04.50');
    expect(result!.get('lrc_01')?.lyric).toBe('Line two');
    expect(result!.get('lrc_02')?.time_start).toBe('00:08.00');
    expect(result!.get('lrc_02')?.lyric).toBe('Line three');
  });

  it('handles multiple timestamp formats (mm:ss.cs)', () => {
    const input = '[00:01.50]First line\n[00:03.25]Second line';
    const result = processLyricsMap(input);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(2);
    expect(result!.get('lrc_00')?.time_start).toBe('00:01.50');
    expect(result!.get('lrc_01')?.time_start).toBe('00:03.25');
  });

  it('returns a single empty line for empty input', () => {
    const result = processLyricsMap('');
    expect(result).not.toBeNull();
    expect(result!.size).toBe(1);
    expect(result!.get('lrc_00')?.lyric).toBe('');
  });

  it('handles plain lyrics without timestamps', () => {
    const input = 'Line one\nLine two\nLine three';
    const result = processLyricsMap(input);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(3);
    expect(result!.get('lrc_00')?.time_start).toBe('00:00.00');
    expect(result!.get('lrc_00')?.lyric).toBe('Line one');
    expect(result!.get('lrc_01')?.lyric).toBe('Line two');
    expect(result!.get('lrc_02')?.lyric).toBe('Line three');
  });

  it('assigns sequential keys (lrc_00, lrc_01, ...)', () => {
    const input = '[00:01.00]A\n[00:02.00]B\n[00:03.00]C';
    const result = processLyricsMap(input);
    expect(result).not.toBeNull();
    expect(Array.from(result!.keys())).toEqual(['lrc_00', 'lrc_01', 'lrc_02']);
  });

  it('handles empty lines between lyrics by preserving a space placeholder', () => {
    const input = '[00:01.00]Line one\n\n[00:04.00]Line two';
    const result = processLyricsMap(input);
    expect(result).not.toBeNull();
    expect(result!.get('lrc_00')?.lyric).toBe('Line one');
    expect(result!.get('lrc_01')?.lyric).toBe('Line two');
  });
});
