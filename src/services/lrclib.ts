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

/**
 * Picks the LRCLib result whose track name is closest to the song name.
 *
 * Ranking (primary key): exact title match > partial (one contains the
 * other) > no match. Synced lyrics are used only as the tie-breaker among
 * equally-close titles, so a synced but unrelated result never beats a
 * closer title match. Returns `undefined` when given no results.
 */
export function pickBestLrcResult(
  results: LRCLibResult[],
  songName: string,
): LRCLibResult | undefined {
  if (results.length === 0) return undefined;

  const target = songName.trim().toLowerCase();

  const score = (result: LRCLibResult): number => {
    const track = result.trackName.trim().toLowerCase();
    if (track === target) return 2;
    if (track.includes(target) || target.includes(track)) return 1;
    return 0;
  };

  return [...results].sort((a, b) => {
    const byScore = score(b) - score(a);
    if (byScore !== 0) return byScore;
    const aSynced = a.syncedLyrics !== null;
    const bSynced = b.syncedLyrics !== null;
    if (aSynced !== bSynced) return aSynced ? -1 : 1;
    return 0;
  })[0];
}
