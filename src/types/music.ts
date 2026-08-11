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
    artist?: {
      id: string;
      name: string;
      aliases?: Array<{ name: string; type?: string }>;
    };
  }>;
  releases?: Array<{ id: string; title: string }>;
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

export interface SocialLink {
  platform: string;
  url: string;
}

export interface MusicBrainzBatchArtistResult {
  links: SocialLink[];
}

export interface MusicBrainzBatchSocialResponse {
  artists: Record<string, MusicBrainzBatchArtistResult>;
}

/** Request body for the Worker's /metadata/full endpoint. */
export interface FullMetadataRequest {
  artistName: string;
  trackName: string;
  albumName?: string;
}

/** Response from the Worker's /metadata/full endpoint. */
export interface FullMetadataResponse {
  trackName: string;
  artistNames: string[];
  artistMbids: string[];
  isrc: string | null;
  coverUrl: string;
  albumName?: string;
  streamingSites: Record<string, string | null>;
  songLinkUrl?: string;
  artistLinks: Array<{ name: string; url: string }>;
  socialLinks: Array<{ platform: string; url: string; artistName?: string }>;
}
