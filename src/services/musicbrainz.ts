import axios from "axios";
import type { MusicBrainzRecording, MusicBrainzArtistRelation } from "@/types/music";

const MUSICBRAINZ_TRACK_ENDPOINT = "/api-musicbrainz/ws/2/recording/";

export async function fetchISRC(
  artistName: string,
  trackName: string,
): Promise<{ isrc: string | null; artistMbids: string[] }> {
  try {
    const response = await axios.get<{ recordings?: MusicBrainzRecording[] }>(
      MUSICBRAINZ_TRACK_ENDPOINT,
      {
        params: {
          query: `artist:'${artistName}' AND recording:'${trackName}'`,
          fmt: "json",
          limit: 1,
        },
        headers: { "User-Agent": "LyricsTranslateTool/1.0" },
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
};

export async function fetchArtistSocialLinks(
  mbid: string,
): Promise<Array<{ platform: string; url: string }>> {
  try {
    const response = await axios.get<{ relations?: MusicBrainzArtistRelation[] }>(
      `/api-musicbrainz-artist/ws/2/artist/${mbid}`,
      {
        params: { inc: "url-rels", fmt: "json" },
        headers: { "User-Agent": "LyricsTranslateTool/1.0" },
      },
    );
    const links: Array<{ platform: string; url: string }> = [];
    response.data?.relations?.forEach((rel) => {
      const platform = RELATION_TYPE_MAP[rel.type];
      if (platform && rel.url?.resource) {
        links.push({ platform, url: rel.url.resource });
      }
    });
    return links;
  } catch {
    return [];
  }
}
