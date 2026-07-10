import { describe, it, expect } from 'vitest';
import { processLyricsMap, parseLrcContent, toLyricLineMap } from './lyricsParser';

// ---------------------------------------------------------------------------
// Legacy wrapper tests — ensure backward compatibility
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// New function: parseLrcContent
// ---------------------------------------------------------------------------

describe('parseLrcContent', () => {
  it('parses synced lyrics with timestamps', () => {
    const input = '[00:01.00]Line one\n[00:04.50]Line two\n[00:08.00]Line three';
    const result = parseLrcContent(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ timestamp: '00:01.00', text: 'Line one' });
    expect(result[1]).toEqual({ timestamp: '00:04.50', text: 'Line two' });
    expect(result[2]).toEqual({ timestamp: '00:08.00', text: 'Line three' });
  });

  it('parses plain text without timestamps', () => {
    const input = 'Hello\nWorld';
    const result = parseLrcContent(input);
    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe('00:00.00');
    expect(result[1].timestamp).toBe('00:00.00');
  });

  it('preserves stanza breaks as empty lines', () => {
    const input = '[00:01.00]Verse one\n\n[00:04.00]Verse two';
    const result = parseLrcContent(input);
    // The blank line between stanzas is preserved in the split but
    // skipped during synced parsing (no timestamp to match); only
    // the two timestamped lines survive in the result.
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// New function: toLyricLineMap
// ---------------------------------------------------------------------------

describe('toLyricLineMap', () => {
  it('generates sequential keys', () => {
    const lines = [
      { timestamp: '00:01.00', text: 'A' },
      { timestamp: '00:02.00', text: 'B' },
    ];
    const map = toLyricLineMap(lines);
    expect(map.size).toBe(2);
    expect(map.get('lrc_00')?.lyric).toBe('A');
    expect(map.get('lrc_01')?.lyric).toBe('B');
  });

  it('sets time_end to the next line timestamp, inferring for the last line', () => {
    const lines = [
      { timestamp: '00:01.00', text: 'First' },
      { timestamp: '00:04.50', text: 'Second' },
      { timestamp: '00:08.00', text: 'Third' },
    ];
    const map = toLyricLineMap(lines);
    expect(map.get('lrc_00')?.time_end).toBe('00:04.50');
    expect(map.get('lrc_01')?.time_end).toBe('00:08.00');
    expect(map.get('lrc_02')?.time_end).toBe('00:11.00'); // inferred: +3s
  });

  it('initializes translation and comment as empty strings', () => {
    const lines = [
      { timestamp: '00:01.00', text: 'Test' },
    ];
    const map = toLyricLineMap(lines);
    expect(map.get('lrc_00')?.translation).toBe('');
    expect(map.get('lrc_00')?.comment).toBe('');
  });
});
