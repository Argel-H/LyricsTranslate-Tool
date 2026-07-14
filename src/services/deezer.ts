import axios from "axios";
import type { DeezerTrack } from "@/types/music";
import { API } from "@/lib/config/apiConfig";

const DEEZER_BASE = API.deezer;

export interface DeezerResult {
  link: string;
  cover: string;
  albumName?: string;
  artists?: string[];
  artistLinks?: Array<{ name: string; url: string }>;
}

function extractArtists(track: DeezerTrack): { artists: string[]; artistLinks: Array<{ name: string; url: string }> } {
  const artists: string[] = [];
  const artistLinks: Array<{ name: string; url: string }> = [];

  if (track.artist?.name) {
    artists.push(track.artist.name);
    if (track.artist.link) {
      artistLinks.push({ name: track.artist.name, url: track.artist.link });
    }
  }

  track.contributors?.forEach((c) => {
    if (c.name !== track.artist?.name) {
      artists.push(c.name);
    }
    if (c.link) {
      artistLinks.push({ name: c.name, url: c.link });
    }
  });

  return { artists, artistLinks };
}

export async function fetchDeezerByISRC(isrc: string): Promise<DeezerResult | null> {
  try {
    const response = await axios.get<DeezerTrack>(
      `${DEEZER_BASE}/2.0/track/isrc:${isrc}`,
    );
    const { artists, artistLinks } = extractArtists(response.data);
    return {
      link: response.data.link,
      cover: response.data.album?.cover_xl ?? "",
      albumName: response.data.album?.title,
      artists: artists.length > 0 ? artists : undefined,
      artistLinks: artistLinks.length > 0 ? artistLinks : undefined,
    };
  } catch (err) {
    console.error("fetchDeezerByISRC failed:", err);
    return null;
  }
}

export async function fetchDeezerByName(
  artistName: string,
  trackName: string,
): Promise<DeezerResult | null> {
  try {
    const response = await axios.get<{ data: DeezerTrack[] }>(
      `${DEEZER_BASE}/search?q=artist:'${encodeURIComponent(artistName)}' track:'${encodeURIComponent(trackName)}'&limit=1`,
    );
    const track = response.data?.data?.[0];
    if (!track) return null;
    const { artists, artistLinks } = extractArtists(track);
    return {
      link: track.link,
      cover: track.album?.cover_xl ?? "",
      albumName: track.album?.title,
      artists: artists.length > 0 ? artists : undefined,
      artistLinks: artistLinks.length > 0 ? artistLinks : undefined,
    };
  } catch (err) {
    console.error("fetchDeezerByName failed:", err);
    return null;
  }
}
