import axios from "axios";
import type { MusicBrainzRecording, MusicBrainzArtistRelation } from "@/types/music";
import { APP_NAME, APP_VERSION } from "@/lib/appConfig";
import { API } from "@/lib/apiConfig";

const USER_AGENT = `${APP_NAME.replace(/\s/g, "")}/${APP_VERSION}`;
const MUSICBRAINZ_BASE = API.musicbrainz;

export async function fetchISRC(
  artistName: string,
  trackName: string,
): Promise<{ isrc: string | null; artistMbids: string[] }> {
  try {
    const response = await axios.get<{ recordings?: MusicBrainzRecording[] }>(
      `${MUSICBRAINZ_BASE}/ws/2/recording/`,
      {
        params: {
          query: `artist:'${artistName}' AND recording:'${trackName}'`,
          fmt: "json",
          limit: 1,
        },
        headers: { "User-Agent": USER_AGENT },
      },
    );
    const recording = response.data?.recordings?.[0];
    const isrc = recording?.isrcs?.[0] ?? null;
    const artistMbids: string[] = [];
    recording?.["artist-credit"]?.forEach((ac) => {
      if (ac.artist?.id) artistMbids.push(ac.artist.id);
    });
    return { isrc, artistMbids };
  } catch (err) {
    console.error("fetchISRC failed:", err);
    return { isrc: null, artistMbids: [] };
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
        headers: { "User-Agent": USER_AGENT },
      },
    );
    const seen = new Set<string>();
    const links: Array<{ platform: string; url: string }> = [];
    response.data?.relations?.forEach((rel) => {
      const resource = rel.url?.resource;
      if (!resource || seen.has(resource)) return;
      const platform = RELATION_TYPE_MAP[rel.type] ?? platformFromUrl(resource);
      if (platform && platform !== "Streaming" && platform !== "Social") {
        seen.add(resource);
        links.push({ platform, url: resource });
      }
    });
    return links;
  } catch {
    return [];
  }
}
