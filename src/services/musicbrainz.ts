import axios from "axios";
import type { MusicBrainzRecording, MusicBrainzArtistRelation, SocialLink, MusicBrainzBatchSocialResponse } from "@/types/music";
import { API } from "@/lib/config/apiConfig";

const MUSICBRAINZ_BASE = API.musicbrainz;

export async function searchMusicBrainzRecording(
  artistName: string,
  trackName: string,
): Promise<{ isrc: string | null; artistMbids: string[]; artistNames: string[]; trackTitle: string | null }> {
  try {
    const response = await axios.get<{ recordings?: MusicBrainzRecording[] }>(
      `${MUSICBRAINZ_BASE}/ws/2/recording/`,
      {
        params: {
          query: `artist:'${artistName}' AND recording:'${trackName}'`,
          fmt: "json",
          limit: 1,
        },
      },
    );
    const recording = response.data?.recordings?.[0];
    const isrc = recording?.isrcs?.[0] ?? null;
    const trackTitle = recording?.title ?? null;
    const artistMbids: string[] = [];
    const artistNames: string[] = [];
    recording?.["artist-credit"]?.forEach((ac) => {
      if (ac.artist?.id) {
        artistMbids.push(ac.artist.id);
        artistNames.push(ac.name);
      }
    });
    return { isrc, artistMbids, artistNames, trackTitle };
  } catch (err) {
    console.error("searchMusicBrainzRecording failed:", err);
    return { isrc: null, artistMbids: [], artistNames: [], trackTitle: null };
  }
}

const RELATION_TYPE_MAP: Record<string, string> = {
  instagram: "Instagram",
  twitter: "Twitter/X",
  facebook: "Facebook",
  youtube: "YouTube",
  "youtube channel": "YouTube",
  tiktok: "TikTok",
  bandcamp: "Bandcamp",
  "official homepage": "Website",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  "apple music": "Apple Music",
  "free streaming": "Streaming",
  streaming: "Streaming",
  "social network": "Social",
};

function platformFromUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    const patterns: [string, string][] = [
      ["twitter.com", "Twitter/X"],
      ["x.com", "Twitter/X"],
      ["facebook.com", "Facebook"],
      ["instagram.com", "Instagram"],
      ["tiktok.com", "TikTok"],
      ["youtube.com", "YouTube"],
      ["soundcloud.com", "SoundCloud"],
      ["spotify.com", "Spotify"],
      ["deezer.com", "Deezer"],
      ["music.apple.com", "Apple Music"],
      ["bandcamp.com", "Bandcamp"],
      ["tidal.com", "Tidal"],
      ["music.amazon.com", "Amazon Music"],
      ["patreon.com", "Patreon"],
      ["genius.com", "Genius"],
    ];
    for (const [pattern, platform] of patterns) {
      if (domain.includes(pattern)) return platform;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchArtistSocialLinks(
  mbid: string,
): Promise<Array<{ platform: string; url: string }>> {
  try {
    const response = await axios.get<{ relations?: MusicBrainzArtistRelation[] }>(
      `${MUSICBRAINZ_BASE}/ws/2/artist/${mbid}`,
      {
        params: { inc: "url-rels", fmt: "json" },
      },
    );
    const seen = new Set<string>();
    const links: Array<{ platform: string; url: string }> = [];
    response.data?.relations?.forEach((rel) => {
      const resource = rel.url?.resource;
      if (!resource) return;
      const typePlatform = RELATION_TYPE_MAP[rel.type];
      const platform = (typePlatform && typePlatform !== "Streaming" && typePlatform !== "Social")
        ? typePlatform
        : platformFromUrl(resource);
      if (platform && !seen.has(platform)) {
        seen.add(platform);
        links.push({ platform, url: resource });
      }
    });
    return links;
  } catch {
    return [];
  }
}

/**
 * Fetches social media links for multiple artists in a single request.
 * Calls the Cloudflare Worker which batches MusicBrainz queries server-side.
 *
 * @param mbids - Array of MusicBrainz artist IDs (max 5)
 * @returns Record mapping each MBID to its social links
 */
export async function fetchBatchArtistSocialLinks(
  mbids: string[],
): Promise<Record<string, { links: SocialLink[] }>> {
  if (!mbids || mbids.length === 0) return {};

  try {
    const response = await fetch(API.musicbrainzBatch, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mbids }),
    });

    if (!response.ok) {
      console.error("fetchBatchArtistSocialLinks failed with status:", response.status);
      return {};
    }

    const data: MusicBrainzBatchSocialResponse = await response.json();
    return data.artists ?? {};
  } catch (err) {
    console.error("fetchBatchArtistSocialLinks failed:", err);
    return {};
  }
}
