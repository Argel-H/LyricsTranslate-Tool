// ---------------------------------------------------------------------------
// Lyrics Section - Binary + Text format
//
// v6 layout:
//   [deltas N×4B u32LE] [durations N×4B u32LE] [locks ceil(N/8)B] [text]
//
// Timings are stored as little-endian unsigned integers (u32LE, max
// 0xffffffff ms ≈ 49.7 days):
//   · delta[0] = absolute time_start (ms)
//   · delta[i] = time_start[i] − time_start[i−1]   (i > 0)
//   · duration = max(0, time_end − time_start)
// Lock flags are packed LSB-first, 1 bit per row.
// Text fields are newline-separated, with \ and \n backslash-escaped.
// Translation text is stored before the original lyric for better compression.
// Since v4, each row stores THREE fields: translation → lyric → comment.
// v3 buffers store two fields per row (no comment); parseLyricsBuffer accepts
// fieldsPerRow=2 to decode them.
// Legacy v3–v5 buffers use u16 timings (N×2B each) and are decoded by passing
// timing="u16" to parseLyricsBuffer.
// The row count (u16LE) is NOT included - the outer share protocol writes it.
// ---------------------------------------------------------------------------

import type { LyricLine } from "@/types/project";
import { trimToUndefined } from "@/lib/stringUtils";

/**
 * Width of each serialized timing value.
 *  - "u32": v6+ timings (4 bytes LE, max 0xffffffff ms)
 *  - "u16": legacy v3–v5 timings (2 bytes LE, max 65535 ms)
 */
export type TimingEncoding = "u16" | "u32";

export function buildLyricsBuffer(rows: LyricLine[], timing: TimingEncoding = "u32"): Uint8Array {
  const N = rows.length;
  if (N === 0) return new Uint8Array(0);

  const sorted = [...rows].sort((a, b) => a.time_start - b.time_start);
  const textEncoder = new TextEncoder();

  const width = timing === "u32" ? 4 : 2;
  const maxTiming = timing === "u32" ? 0xffffffff : 0xffff;

  const deltaBuf = new Uint8Array(N * width);
  const durBuf = new Uint8Array(N * width);
  const lockBuf = new Uint8Array(Math.ceil(N / 8));

  const dv = new DataView(deltaBuf.buffer, deltaBuf.byteOffset, deltaBuf.byteLength);
  const drv = new DataView(durBuf.buffer, durBuf.byteOffset, durBuf.byteLength);

  let prevSt = 0;
  for (let i = 0; i < N; i++) {
    const r = sorted[i];
    const rawStart = r.time_start;
    const delta = i === 0 ? rawStart : rawStart - prevSt;
    const duration = r.time_end - r.time_start;

    // Clamp negatives; rows are pre-sorted so deltas should already be >= 0.
    const d = Math.max(0, delta);
    const dur = Math.max(0, duration);

    // Validate finite and within the representable range for this encoding.
    if (!Number.isFinite(d) || d > maxTiming) {
      throw new Error(`Timing value out of range for ${timing}: ${d}`);
    }
    if (!Number.isFinite(dur) || dur > maxTiming) {
      throw new Error(`Timing value out of range for ${timing}: ${dur}`);
    }

    if (timing === "u32") {
      dv.setUint32(i * width, d, true);
      drv.setUint32(i * width, dur, true);
    } else {
      dv.setUint16(i * width, d, true);
      drv.setUint16(i * width, dur, true);
    }

    if (r.locked) lockBuf[i >> 3] |= 1 << (i & 7);
    prevSt = sorted[i].time_start;
  }

  const esc = (s: string): string =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");

  const textParts: string[] = [];
  for (const r of sorted) {
    textParts.push(esc(r.translation), esc(r.lyric), esc(r.comment ?? ""));
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

export function parseLyricsBuffer(
  count: number,
  buffer: Uint8Array,
  fieldsPerRow: 2 | 3 = 3,
  timing: TimingEncoding = "u32",
): LyricLine[] {
  const N = count;
  if (N === 0) return [];

  const width = timing === "u32" ? 4 : 2;

  const textDecoder = new TextDecoder();
  const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let off = 0;

  const deltas: number[] = [];
  for (let i = 0; i < N; i++) {
    deltas.push(timing === "u32" ? dv.getUint32(off, true) : dv.getUint16(off, true));
    off += width;
  }

  const durations: number[] = [];
  for (let i = 0; i < N; i++) {
    durations.push(timing === "u32" ? dv.getUint32(off, true) : dv.getUint16(off, true));
    off += width;
  }

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
    const translation = unescapeField(parts[i * fieldsPerRow] || "");
    const lyric = unescapeField(parts[i * fieldsPerRow + 1] || "");

    let comment: string | undefined;
    if (fieldsPerRow === 3) {
      const unescaped = unescapeField(parts[i * fieldsPerRow + 2] || "");
      comment = trimToUndefined(unescaped);
    }

    const row: LyricLine = { time_start, time_end, lyric, translation, locked: locked[i] };
    if (comment !== undefined) row.comment = comment;
    rows.push(row);
  }

  return rows;
}
