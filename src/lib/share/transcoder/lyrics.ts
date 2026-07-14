// ---------------------------------------------------------------------------
// Lyrics Section — Binary + Text format
//
// Encodes/decodes an array of LyricLine into a compact binary+text buffer:
//   [deltas N×2B] [durations N×2B] [locks ceil(N/8)B] [text]
//
// Deltas are u16LE — first row stores absolute time_start, subsequent rows
// store the delta from the previous row. Durations are u16LE (time_end − start).
// Lock flags are packed LSB-first, 1 bit per row.
// Text fields are newline-separated, with \ and \n backslash-escaped.
// Translation text is stored before the original lyric for better compression.
// The row count (u16LE) is NOT included — the outer share protocol writes it.
// ---------------------------------------------------------------------------

import type { LyricLine } from "@/types/project";

export function buildLyricsBuffer(rows: LyricLine[]): Uint8Array {
  const N = rows.length;
  if (N === 0) return new Uint8Array(0);

  const sorted = [...rows].sort((a, b) => a.time_start - b.time_start);
  const textEncoder = new TextEncoder();

  const deltaBuf = new Uint8Array(N * 2);
  const durBuf = new Uint8Array(N * 2);
  const lockBuf = new Uint8Array(Math.ceil(N / 8));

  const dv = new DataView(deltaBuf.buffer, deltaBuf.byteOffset, deltaBuf.byteLength);
  const drv = new DataView(durBuf.buffer, durBuf.byteOffset, durBuf.byteLength);

  let prevSt = 0;
  for (let i = 0; i < N; i++) {
    const r = sorted[i];
    const delta = i === 0 ? r.time_start : r.time_start - prevSt;
    dv.setUint16(i * 2, delta, true);
    drv.setUint16(i * 2, r.time_end - r.time_start, true);
    if (r.locked) lockBuf[i >> 3] |= 1 << (i & 7);
    prevSt = r.time_start;
  }

  const esc = (s: string): string =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");

  const textParts: string[] = [];
  for (const r of sorted) {
    textParts.push(esc(r.translation), esc(r.lyric));
  }
  const textBytes = textEncoder.encode(textParts.join("\n"));

  const total = deltaBuf.length + durBuf.length + lockBuf.length + textBytes.length;
  const result = new Uint8Array(total);
  let off = 0;
  result.set(deltaBuf, off); off += deltaBuf.length;
  result.set(durBuf, off);   off += durBuf.length;
  result.set(lockBuf, off);  off += lockBuf.length;
  result.set(textBytes, off);

  return result;
}

function unescapeField(s: string): string {
  const chars: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "n") { chars.push("\n"); i += 2; continue; }
      if (next === "\\") { chars.push("\\"); i += 2; continue; }
    }
    chars.push(s[i]);
    i++;
  }
  return chars.join("");
}

export function parseLyricsBuffer(count: number, buffer: Uint8Array): LyricLine[] {
  const N = count;
  if (N === 0) return [];

  const textDecoder = new TextDecoder();
  const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let off = 0;

  const deltas: number[] = [];
  for (let i = 0; i < N; i++) { deltas.push(dv.getUint16(off, true)); off += 2; }

  const durations: number[] = [];
  for (let i = 0; i < N; i++) { durations.push(dv.getUint16(off, true)); off += 2; }

  const lockBytes = Math.ceil(N / 8);
  const locked: boolean[] = [];
  for (let i = 0; i < N; i++) {
    locked.push((buffer[off + (i >> 3)] & (1 << (i & 7))) !== 0);
  }
  off += lockBytes;

  const textBytes = buffer.slice(off);
  const parts = textDecoder.decode(textBytes).split("\n");

  const rows: LyricLine[] = [];
  let cumTime = 0;

  for (let i = 0; i < N; i++) {
    cumTime = i === 0 ? deltas[i] : cumTime + deltas[i];
    const time_start = cumTime;
    const time_end = time_start + durations[i];
    const translation = unescapeField(parts[i * 2] || "");
    const lyric = unescapeField(parts[i * 2 + 1] || "");

    rows.push({ time_start, time_end, lyric, translation, locked: locked[i] });
  }

  return rows;
}
