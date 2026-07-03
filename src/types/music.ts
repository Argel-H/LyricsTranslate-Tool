export interface LRCLibResult {
  id: number;
  trackName: string;
  artistName: string;
  plainLyrics: string;
  syncedLyrics: string | null;
  instrumental: boolean;
  lang: string;
  isrc: string | null;
  spotifyId: string | null;
  albumName?: string;
  duration?: number;
}

export interface DeezerTrack {
  id: number;
  title: string;
  link: string;
  duration: number;
  album?: {
    id: number;
    title: string;
    cover_xl: string;
  };
  artist?: {
    id: number;
    name: string;
    link?: string;
  };
  contributors?: Array<{
    id: number;
    name: string;
    link?: string;
    role: string;
  }>;
}

export interface MusicBrainzRecording {
  id: string;
  title: string;
  isrcs?: string[];
  "artist-credit"?: Array<{
    name: string;
    joinphrase?: string;
    artist?: { id: string; name: string };
  }>;
  releases?: Array<{ id: string; title: string }>;
}

export interface SimplyTranslateResponse {
  result: string;
  from: string;
  to: string;
  confidence: number;
  timestamp: string;
}

export interface MusicBrainzArtistRelation {
  type: string;
  "type-id"?: string;
  direction?: string;
  url?: {
    id?: string;
    resource: string;
  };
}

export type PlatformLinks = Record<string, string | null>;
