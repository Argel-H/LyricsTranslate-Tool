import { processLyricsMap } from "@/lib/lyricsParser";
import { getArtistName } from "@/lib/artistParser";
import { API } from "@/lib/config/apiConfig";
import type { LyricLine, ProjectCreateInput } from "@/types/project";
import type { LRCLibResult, FullMetadataRequest, FullMetadataResponse } from "@/types/music";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches full metadata from the Cloudflare Worker orchestrator.
 * The Worker handles MusicBrainz → Deezer → Odesli → social links → cover
 * optimization in a single server-side call.
 *
 * Lyric extraction from LRCLIB stays client-side.
 */
export async function getFullMetadata(
  artistName: string,
  trackName: string,
  lrcResult?: LRCLibResult,
): Promise<ProjectCreateInput> {
  const splitArtists = getArtistName(artistName);
  const artistNames = splitArtists.length > 0 ? splitArtists : [artistName].filter(Boolean);
  const metadata = await fetchFullMetadataFromWorker({
    artistNames,
    trackName,
    albumName: lrcResult?.albumName,
  });

  // Process lyrics from LRCLIB (client-side - lightweight parsing)
  let lyrics: Record<string, LyricLine> = {};
  if (lrcResult) {
    const lyricsStr = lrcResult.syncedLyrics || lrcResult.plainLyrics;
    if (lyricsStr) {
      const map = processLyricsMap(lyricsStr);
      if (map) lyrics = Object.fromEntries(map);
    }
  }

  return {
    artistName: metadata.artistNames.length > 0 ? metadata.artistNames : artistNames,
    trackName: metadata.trackName || trackName,
    lyrics,
    coverUrl: metadata.coverUrl || "",
    isrcs: metadata.isrc ?? undefined,
    streamingSites: metadata.streamingSites,
    albumName: metadata.albumName ?? lrcResult?.albumName,
    songLinkUrl: metadata.songLinkUrl,
    artistLinks: metadata.artistLinks,
    recommendedSocialLinks:
      metadata.socialLinks.length > 0 ? metadata.socialLinks : undefined,
  };
}

// ---------------------------------------------------------------------------
// Worker call helper
// ---------------------------------------------------------------------------

async function fetchFullMetadataFromWorker(
  params: FullMetadataRequest,
): Promise<FullMetadataResponse> {
  const response = await fetch(API.metadataFull, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}`);
  }
  return (await response.json()) as FullMetadataResponse;
}
