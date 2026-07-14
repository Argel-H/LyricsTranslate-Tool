/**
 * BinaryWriter — auto-growing buffer with little-endian write primitives.
 * Extracted from the encodeShareUrl closure to provide a single source of
 * truth for all binary encoding in the share protocol.
 */
export class BinaryWriter {
  private buf: Uint8Array;
  private pos = 0;
  private readonly encoder = new TextEncoder();

  constructor(initialSize = 10_000) {
    this.buf = new Uint8Array(initialSize);
  }

  get position(): number {
    return this.pos;
  }

  private ensureSpace(needed: number): void {
    while (this.pos + needed > this.buf.length) {
      const newBuf = new Uint8Array(this.buf.length * 2);
      newBuf.set(this.buf);
      this.buf = newBuf;
    }
  }

  writeU8(v: number): void {
    this.ensureSpace(1);
    this.buf[this.pos++] = v & 0xff;
  }

  writeU16LE(v: number): void {
    this.ensureSpace(2);
    this.buf[this.pos++] = v & 0xff;
    this.buf[this.pos++] = (v >>> 8) & 0xff;
  }

  writeU24LE(v: number): void {
    this.ensureSpace(3);
    this.buf[this.pos++] = v & 0xff;
    this.buf[this.pos++] = (v >>> 8) & 0xff;
    this.buf[this.pos++] = (v >>> 16) & 0xff;
  }

  writeU32LE(v: number): void {
    this.ensureSpace(4);
    this.buf[this.pos++] = v & 0xff;
    this.buf[this.pos++] = (v >>> 8) & 0xff;
    this.buf[this.pos++] = (v >>> 16) & 0xff;
    this.buf[this.pos++] = (v >>> 24) & 0xff;
  }

  writeI16LE(v: number): void {
    this.ensureSpace(2);
    const uv = v < 0 ? 0x10000 + v : v;
    this.buf[this.pos++] = uv & 0xff;
    this.buf[this.pos++] = (uv >>> 8) & 0xff;
  }

  writeBytes(data: Uint8Array): void {
    this.ensureSpace(data.length);
    this.buf.set(data, this.pos);
    this.pos += data.length;
  }

  /** Write a string prefixed by a 1-byte length (max 255 bytes). */
  writeStr1B(s: string | null | undefined): void {
    const data = this.encoder.encode(s ?? "");
    if (data.length > 255) {
      throw new Error(`String exceeds 255 bytes: "${(s ?? "").substring(0, 30)}..."`);
    }
    this.writeU8(data.length);
    this.writeBytes(data);
  }

  /** Write a string prefixed by a 2-byte length (max 65535 bytes). */
  writeStr2B(s: string | null | undefined): void {
    const data = this.encoder.encode(s ?? "");
    if (data.length > 65535) {
      throw new Error(`String exceeds 65535 bytes: "${(s ?? "").substring(0, 30)}..."`);
    }
    this.writeU16LE(data.length);
    this.writeBytes(data);
  }

  /** Overwrite a previously-written U24LE value at the given position. */
  patchU24LE(pos: number, v: number): void {
    this.buf[pos] = v & 0xff;
    this.buf[pos + 1] = (v >>> 8) & 0xff;
    this.buf[pos + 2] = (v >>> 16) & 0xff;
  }

  /** Return a copy of the written data as an ArrayBuffer. */
  toArrayBuffer(): ArrayBuffer {
    return this.buf.slice(0, this.pos).buffer;
  }
}
