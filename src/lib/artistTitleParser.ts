export interface ParsedArtistTitle {
  artistName: string;
  trackName: string;
}

/**
 * Splits "Artist - Title" on the FIRST " - " separator.
 *
 * Rules:
 * - Only the literal spaced-hyphen separator `" - "` is recognized.
 * - Split on the FIRST occurrence, so titles that contain " - " (e.g.
 *   "Track - Remix") are preserved in `trackName`.
 * - If there is no separator, or either side is empty after trimming, the
 *   whole string is returned as `trackName` with an empty `artistName`.
 */
export function parseArtistTitle(query: string): ParsedArtistTitle {
  const trimmed = query.trim();
  const idx = trimmed.indexOf(" - ");
  if (idx <= 0) return { artistName: "", trackName: trimmed };
  const artistName = trimmed.slice(0, idx).trim();
  const trackName = trimmed.slice(idx + 3).trim();
  if (!artistName || !trackName) return { artistName: "", trackName: trimmed };
  return { artistName, trackName };
}
