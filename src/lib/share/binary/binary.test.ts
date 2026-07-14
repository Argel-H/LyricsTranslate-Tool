import { describe, it, expect } from 'vitest';
import { BinaryWriter } from '@/lib/share/binary/BinaryWriter';
import { BinaryReader } from '@/lib/share/binary/BinaryReader';

describe('BinaryWriter + BinaryReader', () => {
  it('round-trips writeU8 / readU8', () => {
    const w = new BinaryWriter();
    w.writeU8(0);
    w.writeU8(255);
    w.writeU8(128);
    const r = new BinaryReader(w.toArrayBuffer());
    expect(r.readU8()).toBe(0);
    expect(r.readU8()).toBe(255);
    expect(r.readU8()).toBe(128);
  });

  it('round-trips U16LE, U24LE, and U32LE', () => {
    const w = new BinaryWriter();
    w.writeU16LE(0);
    w.writeU16LE(65535);
    w.writeU24LE(16777215);
    w.writeU32LE(0xdeadbeef);
    const r = new BinaryReader(w.toArrayBuffer());
    expect(r.readU16LE()).toBe(0);
    expect(r.readU16LE()).toBe(65535);
    expect(r.readU24LE()).toBe(16777215);
    expect(r.readU32LE()).toBe(0xdeadbeef);
  });

  it('round-trips writeI16LE / readI16LE with signed values', () => {
    const w = new BinaryWriter();
    w.writeI16LE(0);
    w.writeI16LE(32767);
    w.writeI16LE(-32768);
    w.writeI16LE(-1);
    w.writeI16LE(128);
    const r = new BinaryReader(w.toArrayBuffer());
    expect(r.readI16LE()).toBe(0);
    expect(r.readI16LE()).toBe(32767);
    expect(r.readI16LE()).toBe(-32768);
    expect(r.readI16LE()).toBe(-1);
    expect(r.readI16LE()).toBe(128);
  });

  it('writeStr throws on oversized strings, round-trips edge cases', () => {
    const wThrow1 = new BinaryWriter();
    expect(() => wThrow1.writeStr1B('A'.repeat(256))).toThrow('exceeds 255 bytes');
    const wThrow2 = new BinaryWriter();
    expect(() => wThrow2.writeStr2B('A'.repeat(65536))).toThrow('exceeds 65535 bytes');

    const w = new BinaryWriter();
    w.writeStr1B('');
    w.writeStr1B('hello');
    w.writeStr1B('A'.repeat(255));
    w.writeStr1B(null as unknown as string);
    w.writeStr1B(undefined as unknown as string);
    w.writeStr2B('');
    w.writeStr2B('longer test string');
    w.writeStr2B(null as unknown as string);
    w.writeStr2B(undefined as unknown as string);
    const r = new BinaryReader(w.toArrayBuffer());
    expect(r.readStr1B()).toBe('');
    expect(r.readStr1B()).toBe('hello');
    expect(r.readStr1B()).toBe('A'.repeat(255));
    expect(r.readStr1B()).toBe('');
    expect(r.readStr1B()).toBe('');
    expect(r.readStr2B()).toBe('');
    expect(r.readStr2B()).toBe('longer test string');
    expect(r.readStr2B()).toBe('');
    expect(r.readStr2B()).toBe('');
  });

  it('patchU24LE overwrites previous position and seek moves reader', () => {
    const w = new BinaryWriter();
    w.writeU24LE(0);
    w.writeU8(99);
    w.patchU24LE(0, 0x123456);
    const r = new BinaryReader(w.toArrayBuffer());
    expect(r.readU24LE()).toBe(0x123456);
    expect(r.readU8()).toBe(99);

    const w2 = new BinaryWriter();
    w2.writeU8(10);
    w2.writeU8(20);
    w2.writeU8(30);
    const r2 = new BinaryReader(w2.toArrayBuffer());
    r2.seek(2);
    expect(r2.readU8()).toBe(30);
  });
});
