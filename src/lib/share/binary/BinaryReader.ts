/**
 * BinaryReader — cursor-based read from a Uint8Array with little-endian
 * primitives. Extracted from the decodeShareUrl closure to provide a single
 * source of truth for all binary decoding in the share protocol.
 */
export class BinaryReader {
  private readonly buf: Uint8Array;
  private pos = 0;
  private readonly decoder = new TextDecoder();

  constructor(data: ArrayBuffer | Uint8Array) {
    this.buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  }

  get position(): number {
    return this.pos;
  }

  get remaining(): number {
    return this.buf.length - this.pos;
  }

  seek(offset: number): void {
    this.pos = offset;
  }

  readU8(): number {
    if (this.pos >= this.buf.length) throw new Error("Unexpected end of buffer");
    return this.buf[this.pos++];
  }

  readU16LE(): number {
    if (this.pos + 2 > this.buf.length) throw new Error("Unexpected end of buffer");
    const v = this.buf[this.pos] | (this.buf[this.pos + 1] << 8);
    this.pos += 2;
    return v;
  }

  readU24LE(): number {
    if (this.pos + 3 > this.buf.length) throw new Error("Unexpected end of buffer");
    const v = this.buf[this.pos] | (this.buf[this.pos + 1] << 8) | (this.buf[this.pos + 2] << 16);
    this.pos += 3;
    return v;
  }

  readU32LE(): number {
    if (this.pos + 4 > this.buf.length) throw new Error("Unexpected end of buffer");
    const v = this.buf[this.pos] | (this.buf[this.pos + 1] << 8) | (this.buf[this.pos + 2] << 16) | (this.buf[this.pos + 3] << 24);
    this.pos += 4;
    return v >>> 0;
  }

  readI16LE(): number {
    if (this.pos + 2 > this.buf.length) throw new Error("Unexpected end of buffer");
    let v = this.buf[this.pos] | (this.buf[this.pos + 1] << 8);
    if (v & 0x8000) v = v - 0x10000;
    this.pos += 2;
    return v;
  }

  readBytes(n: number): Uint8Array {
    if (this.pos + n > this.buf.length) throw new Error(`Unexpected end of buffer`);
    const slice = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    return slice;
  }

  /** Read a string prefixed by a 1-byte length. */
  readStr1B(): string {
    const len = this.readU8();
    if (len === 0) return "";
    return this.decoder.decode(this.readBytes(len));
  }

  /** Read a string prefixed by a 2-byte length. */
  readStr2B(): string {
    const len = this.readU16LE();
    if (len === 0) return "";
    return this.decoder.decode(this.readBytes(len));
  }
}
