import axios from "axios";
import type { LRCLibResult } from "@/types/music";
import { API } from "@/lib/config/apiConfig";

const LRCLIB_ENDPOINT = `${API.lrclib}/api/search?q=`;

/**
 * Matches video-type markers inside parentheses in a track name, e.g.
 * "(Lyric Video)", "(Official Lyric Video)", "(Lyrics)", "(Letra)".
 *
 * We discard such results because the suffixed track name is not the real
 * song title: sending it downstream to the Worker would corrupt metadata
 * lookups (MusicBrainz, Deezer, Odesli). The marker must be wrapped in
 * parentheses, so a song genuinely titled "Lyric" (without parens) is
 * never filtered out.
 */
const JUNK_TRACK_PATTERN = /\([^)]*?\b(lyric|letra)s?\b[^)]*?\)/i;

export async function searchLrcLib(
  query: string,
  options?: { signal?: AbortSignal },
): Promise<LRCLibResult[]> {
  if (!query.trim()) return [];
  try {
    const response = await axios.get<LRCLibResult[]>(
      `${LRCLIB_ENDPOINT}${encodeURIComponent(query)}`,
      { signal: options?.signal },
    );
    const results = response.data ?? [];
    // Filter out results whose trackName contains video-type markers
    // like "(Lyric Video)", "(Letra)", "(Official Lyric Video)", etc.
    return results.filter((r) => !JUNK_TRACK_PATTERN.test(r.trackName ?? ""));
  } catch {
    return [];
  }
}
