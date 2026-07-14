import { describe, it, expect } from 'vitest';
import { processLyricsMap, parseLrcContent, toLyricLineMap } from './lyricsParser';

describe('processLyricsMap', () => {
  it('parses synced lyrics with timestamps (multiple formats) and empty input', () => {
    const input = '[00:01.00]Line one\n[00:04.50]Line two\n[00:08.00]Line three';
    const result = processLyricsMap(input);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(3);
    expect(result!.get('lrc_00')?.time_start).toBe(1000);
    expect(result!.get('lrc_01')?.time_start).toBe(4500);
    expect(result!.get('lrc_02')?.time_start).toBe(8000);

    const empty = processLyricsMap('');
    expect(empty).not.toBeNull();
    expect(empty!.size).toBe(1);
    expect(empty!.get('lrc_00')?.lyric).toBe('');
  });

  it('handles plain lyrics without timestamps', () => {
    const input = 'Line one\nLine two\nLine three';
    const result = processLyricsMap(input);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(3);
    expect(result!.get('lrc_00')?.time_start).toBe(0);
    expect(result!.get('lrc_00')?.lyric).toBe('Line one');
    expect(result!.get('lrc_01')?.lyric).toBe('Line two');
  });
});

describe('parseLrcContent', () => {
  it('parses synced lyrics with timestamps and plain text', () => {
    const synced = parseLrcContent('[00:01.00]Line one\n[00:04.50]Line two');
    expect(synced).toHaveLength(2);
    expect(synced[0]).toEqual({ timestamp: '00:01.00', text: 'Line one' });

    const plain = parseLrcContent('Hello\nWorld');
    expect(plain).toHaveLength(2);
    expect(plain[0].timestamp).toBe(0);
    expect(plain[1].timestamp).toBe(0);
  });
});

describe('toLyricLineMap', () => {
  it('sets time_end to next line timestamp, inferring for the last line', () => {
    const lines = [
      { timestamp: '00:01.00', text: 'First' },
      { timestamp: '00:04.50', text: 'Second' },
      { timestamp: '00:08.00', text: 'Third' },
    ];
    const map = toLyricLineMap(lines);
    expect(map.get('lrc_00')?.time_end).toBe(4500);
    expect(map.get('lrc_01')?.time_end).toBe(8000);
    expect(map.get('lrc_02')?.time_end).toBe(11000);
  });
});
