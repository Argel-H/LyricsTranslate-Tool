/** Discriminator prefix marking a base64-encoded audio_url. */
export const AUDIO_URL_PREFIX = "b64:";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Base64-encodes a plain audio URL for YAML export, prefixed with the discriminator. */
export function encodeAudioUrl(url: string): string {
  return AUDIO_URL_PREFIX + toBase64(url);
}

/**
 * Decodes an audio_url value on YAML import.
 * Returns the value unchanged when the discriminator prefix is absent (legacy).
 */
export function decodeAudioUrl(value: string): string {
  if (!value.startsWith(AUDIO_URL_PREFIX)) return value;
  const encoded = value.slice(AUDIO_URL_PREFIX.length);
  try {
    return fromBase64(encoded);
  } catch {
    throw new Error("Invalid base64 in audio_url");
  }
}
