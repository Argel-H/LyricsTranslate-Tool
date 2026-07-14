// ---------------------------------------------------------------------------
// Binary Share Protocol — Constants and Type Definitions
//
// Encodes a Project into a compact binary buffer, compresses with Brotli,
// and Base64URL-encodes for embedding in a shareable URL.
//
// All integers in the binary format are little-endian, unsigned unless noted.
// ---------------------------------------------------------------------------

/** Protocol version byte. Must be the first byte of every encoded buffer. */
export const SHARE_VERSION = 0x03;

// ---------------------------------------------------------------------------
// Language Dictionary (4-bit, max 15)
// Maps internal 4-bit IDs to human-readable language names as stored in Project.
// ---------------------------------------------------------------------------

export const LANGUAGE_DICT: Record<number, string> = {
  0: "",          // null / not specified
  1: "English",
  2: "Spanish",
  3: "Portuguese",
  // 4-15: reserved
} as const;

/** Reverse lookup: language name → 4-bit ID */
export const LANGUAGE_NAME_TO_ID: Record<string, number> = {
  "": 0,
  "English": 1,
  "Spanish": 2,
  "Portuguese": 3,
};

// ---------------------------------------------------------------------------
// Platform Dictionary (4-bit, max 15)
// Shared across artist social links AND streaming sites.
//
// isFullUrl=true means the link is an arbitrary URL (e.g., personal website)
// and must be stored in full. For all others, we strip a known prefix and
// store only the ID portion.
// ---------------------------------------------------------------------------

export interface PlatformDef {
  /** Index 0-15 in the 4-bit dictionary */
  id: number;
  /** Human-readable platform name (e.g., "Spotify") */
  name: string;
  /** If true, the URL cannot be reconstructed from an ID — store the full URL */
  isFullUrl: boolean;
  /** URL prefix to strip when encoding artist links (omit trailing slash ID) */
  artistUrlPrefix?: string;
  /** URL prefix to strip when encoding streaming track links */
  trackUrlPrefix?: string;
}

export const PLATFORM_DICT: PlatformDef[] = [
  { id: 0,  name: "Website",     isFullUrl: true },
  { id: 1,  name: "Deezer",      isFullUrl: false, artistUrlPrefix: "https://www.deezer.com/artist/",   trackUrlPrefix: "https://www.deezer.com/track/" },
  { id: 2,  name: "Spotify",     isFullUrl: false, artistUrlPrefix: "https://open.spotify.com/artist/", trackUrlPrefix: "https://open.spotify.com/track/" },
  { id: 3,  name: "Genius",      isFullUrl: false, artistUrlPrefix: "https://genius.com/artists/",      trackUrlPrefix: null as unknown as string },  // Genius has no track links
  { id: 4,  name: "Apple Music", isFullUrl: false, artistUrlPrefix: "https://music.apple.com/artist/",  trackUrlPrefix: "https://music.apple.com/track/" },
  { id: 5,  name: "Twitter/X",   isFullUrl: false, artistUrlPrefix: "https://twitter.com/",             trackUrlPrefix: null as unknown as string },
  { id: 6,  name: "Facebook",    isFullUrl: false, artistUrlPrefix: "https://www.facebook.com/",         trackUrlPrefix: null as unknown as string },
  { id: 7,  name: "Instagram",   isFullUrl: false, artistUrlPrefix: "https://www.instagram.com/",        trackUrlPrefix: null as unknown as string },
  { id: 8,  name: "TikTok",      isFullUrl: false, artistUrlPrefix: "https://www.tiktok.com/",           trackUrlPrefix: null as unknown as string },
  { id: 9,  name: "SoundCloud",  isFullUrl: false, artistUrlPrefix: "https://soundcloud.com/",           trackUrlPrefix: null as unknown as string },
  { id: 10, name: "Amazon Music",isFullUrl: false, artistUrlPrefix: "https://music.amazon.com/artists/", trackUrlPrefix: "https://music.amazon.com/track/" },
  { id: 11, name: "Tidal",       isFullUrl: false, artistUrlPrefix: "https://tidal.com/artist/",         trackUrlPrefix: "https://tidal.com/track/" },
  { id: 12, name: "YouTube",     isFullUrl: false, artistUrlPrefix: "https://www.youtube.com/channel/",  trackUrlPrefix: "https://www.youtube.com/watch?v=" },
];

/** Map platform name → PlatformDef */
export const PLATFORM_NAME_TO_DEF: Record<string, PlatformDef> = {};
for (const def of PLATFORM_DICT) {
  PLATFORM_NAME_TO_DEF[def.name] = def;
  // Also map lowercase for fuzzy matching
  PLATFORM_NAME_TO_DEF[def.name.toLowerCase()] = def;
}

/** Map platform ID → PlatformDef (O(1) lookup) */
export const PLATFORM_BY_ID: Record<number, PlatformDef> = {};
for (const def of PLATFORM_DICT) {
  PLATFORM_BY_ID[def.id] = def;
}

// ---------------------------------------------------------------------------
// Streaming Site Keys (as stored in Project.streamingSites)
// Mapping from internal key → Platform ID
// ---------------------------------------------------------------------------

export const STREAMING_KEY_TO_PLATFORM_ID: Record<string, number> = {
  "deezer":      1,
  "spotify":     2,
  "appleMusic":  4,
  "youtube":     12,
  "amazonMusic": 10,
  "soundcloud":  9,
  "tidal":       11,
};

/** Inverse mapping: platform ID → streaming site key */
export const PLATFORM_ID_TO_STREAMING_KEY: Record<number, string> = {};
for (const [key, id] of Object.entries(STREAMING_KEY_TO_PLATFORM_ID)) {
  PLATFORM_ID_TO_STREAMING_KEY[id] = key;
}

// ---------------------------------------------------------------------------
// Format Constants
// ---------------------------------------------------------------------------

/** Max lyric text bytes per line (7 bits available after MSB locked flag) */
export const MAX_LYRIC_LINE_BYTES = 127;

/** Max string length with 1-byte length prefix */
export const MAX_STRING_BYTES = 255;

/** Max URL length with 2-byte length prefix */
export const MAX_URL_BYTES = 65535;

/** Max delta between consecutive time_start values (ms). Lines >65s apart unsupported. */
export const MAX_DELTA_MS = 65535;

/** Max lyrics rows */
export const MAX_ROW_COUNT = 65535;

/** Max artists per project */
export const MAX_ARTIST_COUNT = 15;

/** Max links per artist */
export const MAX_LINKS_PER_ARTIST = 15;

/**
 * Returns the base URL for share links.
 * Uses the current origin so localhost generates localhost links
 * and production generates production links.
 */
export function getShareBaseUrl(): string {
  return `${window.location.origin}/s/`;
}
