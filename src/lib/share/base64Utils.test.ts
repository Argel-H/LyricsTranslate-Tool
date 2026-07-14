import { describe, it, expect } from 'vitest';
import { arrayBufferToBase64URL, base64URLToArrayBuffer } from '@/lib/share/base64Utils';

function ab2str(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

describe('base64Utils', () => {
  it('round-trips data correctly', () => {
    const original = new TextEncoder().encode('Hello, World!').buffer;
    const encoded = arrayBufferToBase64URL(original);
    const decoded = base64URLToArrayBuffer(encoded);
    expect(ab2str(decoded)).toBe('Hello, World!');
  });

  it('produces URL-safe output (no +, /, or =)', () => {
    const data = new TextEncoder().encode('test data with some bytes').buffer;
    const encoded = arrayBufferToBase64URL(data);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('handles binary data with all byte values 0-255', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const encoded = arrayBufferToBase64URL(bytes.buffer);
    const decoded = base64URLToArrayBuffer(encoded);
    expect(new Uint8Array(decoded)).toEqual(bytes);
  });
});
