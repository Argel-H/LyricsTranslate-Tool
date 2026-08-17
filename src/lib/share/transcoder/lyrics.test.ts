import { describe, it, expect } from 'vitest';
import { buildLyricsBuffer, parseLyricsBuffer } from '@/lib/share/transcoder/lyrics';
import type { LyricLine } from '@/types/project';

describe('Lyrics round-trip', () => {
  const sampleRows: LyricLine[] = [
    { time_start: 0, time_end: 1000, lyric: 'Hello world', translation: 'Hola mundo', locked: false, comment: 'First line note' },
    { time_start: 1500, time_end: 3000, lyric: 'Goodbye', translation: 'Adiós', locked: true },
    { time_start: 4000, time_end: 5500, lyric: 'Line with\nnewline', translation: 'Línea con\nsalto', locked: false, comment: 'Comment with\nnewline and \\backslash' },
    { time_start: 6000, time_end: 8000, lyric: 'Back\\slash', translation: 'Barra\\inversa', locked: false, comment: '   ' },
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

  it('round-trips comments, including newlines and backslashes', () => {
    const buf = buildLyricsBuffer(sampleRows);
    const decoded = parseLyricsBuffer(sampleRows.length, buf);
    expect(decoded[0].comment).toBe('First line note');
    expect(decoded[2].comment).toBe('Comment with\nnewline and \\backslash');
  });

  it('treats absent/empty/whitespace comments as undefined', () => {
    const buf = buildLyricsBuffer(sampleRows);
    const decoded = parseLyricsBuffer(sampleRows.length, buf);
    expect(decoded[1].comment).toBeUndefined();
    expect(decoded[3].comment).toBeUndefined();
  });

  it('decodes legacy 2-field (v3-style) buffers with comment undefined', () => {
    const v3Rows: LyricLine[] = [
      { time_start: 0, time_end: 1000, lyric: 'Hello', translation: 'Hola', locked: false },
      { time_start: 2000, time_end: 3000, lyric: 'World', translation: 'Mundo', locked: true },
    ];
    const buf = buildTwoFieldBuffer(v3Rows);
    const decoded = parseLyricsBuffer(v3Rows.length, buf, 2);
    expect(decoded).toHaveLength(2);
    expect(decoded[0].lyric).toBe('Hello');
    expect(decoded[0].translation).toBe('Hola');
    expect(decoded[0].comment).toBeUndefined();
    expect(decoded[1].locked).toBe(true);
    expect(decoded[1].comment).toBeUndefined();
  });
});

/**
 * Builds a v3-compatible lyrics buffer: same binary layout as buildLyricsBuffer
 * but only TWO text fields per row (translation, lyric) - no comment.
 * Used to verify parseLyricsBuffer(..., fieldsPerRow=2) backwards compatibility.
 */
function buildTwoFieldBuffer(rows: LyricLine[]): Uint8Array {
  const N = rows.length;
  const sorted = [...rows].sort((a, b) => a.time_start - b.time_start);
  const esc = (s: string): string => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");

  const deltaBuf = new Uint8Array(N * 2);
  const durBuf = new Uint8Array(N * 2);
  const lockBuf = new Uint8Array(Math.ceil(N / 8));
  const dv = new DataView(deltaBuf.buffer, deltaBuf.byteOffset, deltaBuf.byteLength);
  const drv = new DataView(durBuf.buffer, durBuf.byteOffset, durBuf.byteLength);

  let prevSt = 0;
  for (let i = 0; i < N; i++) {
    const r = sorted[i];
    dv.setUint16(i * 2, i === 0 ? r.time_start : r.time_start - prevSt, true);
    drv.setUint16(i * 2, r.time_end - r.time_start, true);
    if (r.locked) lockBuf[i >> 3] |= 1 << (i & 7);
    prevSt = r.time_start;
  }

  const textParts: string[] = [];
  for (const r of sorted) {
    textParts.push(esc(r.translation), esc(r.lyric));
  }
  const textBytes = new TextEncoder().encode(textParts.join("\n"));

  const total = deltaBuf.length + durBuf.length + lockBuf.length + textBytes.length;
  const result = new Uint8Array(total);
  let off = 0;
  result.set(deltaBuf, off); off += deltaBuf.length;
  result.set(durBuf, off);   off += durBuf.length;
  result.set(lockBuf, off);  off += lockBuf.length;
  result.set(textBytes, off);
  return result;
}
