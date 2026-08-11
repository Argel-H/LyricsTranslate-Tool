import { processLyricsMap } from "@/lib/lyricsParser";
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
  const metadata = await fetchFullMetadataFromWorker({
    artistName,
    trackName,
    albumName: lrcResult?.albumName,
  });

  // Process lyrics from LRCLIB (client-side — lightweight parsing)
  let lyrics: Record<string, LyricLine> = {};
  if (lrcResult) {
    const lyricsStr = lrcResult.syncedLyrics || lrcResult.plainLyrics;
    if (lyricsStr) {
      const map = processLyricsMap(lyricsStr);
      if (map) lyrics = Object.fromEntries(map);
    }
  }

  return {
    artistName: metadata.artistNames.length > 0 ? metadata.artistNames : [artistName],
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
  try {
    const response = await fetch(API.metadataFull, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error("fetchFullMetadataFromWorker failed with status:", response.status);
      return emptyMetadata();
    }

    const data: FullMetadataResponse = await response.json();
    return data;
  } catch (err) {
    console.error("fetchFullMetadataFromWorker failed:", err);
    return emptyMetadata();
  }
}

/** Sensible defaults when the Worker is unreachable. */
function emptyMetadata(): FullMetadataResponse {
  return {
    trackName: "",
    artistNames: [],
    artistMbids: [],
    isrc: null,
    coverUrl: "",
    streamingSites: {
      deezer: null,
      spotify: null,
      appleMusic: null,
      youtube: null,
      amazonMusic: null,
      soundcloud: null,
      tidal: null,
    },
    artistLinks: [],
    socialLinks: [],
  };
}
