/**
 * Convert an ArrayBuffer to a URL-safe Base64 string.
 *
 * The standard base64 characters are mapped to URL-safe alternatives:
 *   - `+` → `-`
 *   - `/` → `_`
 * Padding (`=`) is stripped.
 *
 * @param buffer - The raw bytes to encode.
 * @returns A URL-safe Base64-encoded string (no padding).
 */
export function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert a URL-safe Base64 string back into an ArrayBuffer.
 *
 * Reverses the transformations applied by `arrayBufferToBase64URL`:
 *   - `-` → `+`
 *   - `_` → `/`
 * Padding is restored so the string length is a multiple of 4.
 *
 * @param str - A URL-safe Base64-encoded string (with or without padding).
 * @returns The decoded raw bytes as an ArrayBuffer.
 */
export function base64URLToArrayBuffer(str: string): ArrayBuffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
