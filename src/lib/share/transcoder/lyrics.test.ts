import { describe, it, expect } from 'vitest';
import { buildLyricsBuffer, parseLyricsBuffer } from '@/lib/share/transcoder/lyrics';
import type { LyricLine } from '@/types/project';

describe('Lyrics round-trip', () => {
  const sampleRows: LyricLine[] = [
    { time_start: 0, time_end: 1000, lyric: 'Hello world', translation: 'Hola mundo', locked: false },
    { time_start: 1500, time_end: 3000, lyric: 'Goodbye', translation: 'Adiós', locked: true },
    { time_start: 4000, time_end: 5500, lyric: 'Line with\nnewline', translation: 'Línea con\nsalto', locked: false },
    { time_start: 6000, time_end: 8000, lyric: 'Back\\slash', translation: 'Barra\\inversa', locked: false },
  ];

  it('encodes and decodes with \\n and \\\\ escaping', () => {
    const buf = buildLyricsBuffer(sampleRows);
    const decoded = parseLyricsBuffer(sampleRows.length, buf);
    expect(decoded).toHaveLength(4);
    expect(decoded[0].lyric).toBe('Hello world');
    expect(decoded[1].locked).toBe(true);
    expect(decoded[2].lyric).toBe('Line with\nnewline');
    expect(decoded[2].translation).toBe('Línea con\nsalto');
    expect(decoded[3].lyric).toBe('Back\\slash');
  });

  it('handles empty input', () => {
    const buf = buildLyricsBuffer([]);
    expect(buf.byteLength).toBe(0);
    const decoded = parseLyricsBuffer(0, buf);
    expect(decoded).toHaveLength(0);
  });

  it('preserves timing precision', () => {
    const buf = buildLyricsBuffer(sampleRows);
    const decoded = parseLyricsBuffer(sampleRows.length, buf);
    for (let i = 0; i < sampleRows.length; i++) {
      expect(decoded[i].time_start).toBe(sampleRows[i].time_start);
      expect(decoded[i].time_end).toBe(sampleRows[i].time_end);
    }
  });

  it('sorts rows by time_start before encoding', () => {
    const unsorted: LyricLine[] = [
      { time_start: 5000, time_end: 6000, lyric: 'Second', translation: 'Segundo', locked: false },
      { time_start: 0, time_end: 1000, lyric: 'First', translation: 'Primero', locked: false },
    ];
    const buf = buildLyricsBuffer(unsorted);
    const decoded = parseLyricsBuffer(unsorted.length, buf);
    expect(decoded[0].time_start).toBe(0);
    expect(decoded[0].lyric).toBe('First');
    expect(decoded[1].time_start).toBe(5000);
  });
});
