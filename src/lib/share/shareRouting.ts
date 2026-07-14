// ---------------------------------------------------------------------------
// Shared URL routing helpers for the share feature.
// Provides a single source of truth for paste ID detection and base URL
// stripping so that inline regex duplication is eliminated.
// ---------------------------------------------------------------------------

export const SHARE_PATH_PREFIX = "/s/";

/**
 * Tests whether the given string is a short paste ID (1-20 alphanumeric chars).
 */
export function isPasteId(s: string): boolean {
  return /^[A-Za-z0-9]{1,20}$/.test(s);
}

/**
 * Strips the "https://<host>/s/" prefix if present, returning only the
 * trailing path segment (the raw payload or paste ID).
 */
export function stripShareBase(url: string): string {
  return url.replace(/^https?:\/\/[^/]+\/s\//, "");
}
