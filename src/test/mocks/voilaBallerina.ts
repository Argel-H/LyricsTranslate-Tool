import type { LRCLibResult } from "@/types/music";

/**
 * Mock data for "Ballerina (with The Word Alive)" by VOILÀ, The Word Alive
 * All data sourced from real API responses (LRCLIB, MusicBrainz, Deezer, Odesli)
 * Date: 2026-07-09
 */

// ─── LRCLIB Search Result ───────────────────────────────────────────
export const MOCK_LRCLIB_RESULT: LRCLibResult = {
  id: 15028187,
  trackName: "Ballerina (with The Word Alive)",
  artistName: "VOILÀ, The Word Alive",
  plainLyrics: "", // not needed — we use synced
  syncedLyrics: [
    "[00:27.12] If silence is golden then we must be rich",
    "[00:30.19] But the breath that we're holding's feeling counterfeit",
    "[00:33.63] The time that you've stolen shouldn't hurt like this",
    "[00:37.45] But the truth is",
    "[00:40.04] And if silence is golden, here's our golden years",
    "[00:43.48] So why am I choking up on all these tears?",
    "[00:47.13] Words left unspoken shouldn't hurt like this",
    "[00:50.62] But the truth is",
    "[00:52.84] I'm sorry, what's your excuse?",
    "[00:56.40] You're dancing 'round the subject",
    "[00:59.48] Tiptoe around the bad news",
    "[01:02.97] Somehow I think you love it",
    "[01:06.22] Ballerina dressed in black",
    "[01:09.53] I wanna scream but you got my neck",
    "[01:12.92] I'm sorry, what's your excuse?",
    "[01:16.21] You're dancing 'round the subject",
    "[01:19.29] 'Round and 'round and 'round and 'round",
    "[01:22.41] 'Round and 'round and 'round",
    "[01:25.83] And there's a bull in the ballroom, but you say we're fine",
    "[01:29.37] While you're waving your red flags around the whole time",
    "[01:32.95] It isn't poetic, but I'm sick of lying",
    "[01:36.52] When the truth is",
    "[01:39.52] You bend over backwards to step on my toes",
    "[01:42.78] Every moment that's mine, you go and make your own",
    "[01:45.79] Don't try to deny it, 'cause I know you know",
    "[01:49.70] What the truth is",
    "[01:52.23] I'm sorry, what's your excuse?",
    "[01:55.76] You're dancing 'round the subject",
    "[01:58.76] Tiptoe around the bad news",
    "[02:01.89] Somehow I think you love it",
    "[02:05.22] Ballerina dressed in black",
    "[02:08.48] I wanna scream but you got my neck",
    "[02:12.08] I'm sorry, what's your excuse?",
    "[02:15.16] You're dancing 'round the subject",
    "[02:21.83] The lights are now on and the band's gone home",
    "[02:25.53] We're spinning in circles so no one would know",
    "[02:28.84] The song in your head ain't one I've heard before",
    "[02:32.67] And you know what the truth is",
    "[02:39.15] And you know what the truth is",
    "[02:47.99] 'Round and 'round and 'round and 'round",
    "[02:51.28] 'Round and 'round and 'round",
    "[02:52.23] And you know what the truth is",
    "[02:54.46] 'Round and 'round and 'round and 'round",
    "[02:57.70] 'Round and 'round and 'round",
    "[03:01.27] I'm sorry, what's your excuse?",
    "[03:04.78] You're dancing 'round the subject",
    "[03:08.01] Tiptoe around the bad news",
    "[03:11.07] Somehow I think you love it",
    "[03:14.30] Ballerina dressed in black",
    "[03:17.75] I wanna scream but you got my neck",
    "[03:20.74] I'm sorry, what's your excuse?",
    "[03:24.45] You're dancing 'round the subject",
    "[03:28.37] ",
  ].join("\n"),
  instrumental: false,
  lang: "en",
  isrc: "QM24S2405530",
  spotifyId: null,
  albumName: "VOILÀ",
  duration: 215,
};

// ─── MusicBrainz ISRC Response ─────────────────────────────────────
export const MOCK_MUSICBRAINZ_ISRC = {
  isrc: "QM24S2405530",
  artistMbids: [
    "a65344cf-73e5-48fc-800c-3415a5ab038d",  // VOILÀ
    "e2cd69b3-ef80-4d53-aa86-a97d6f44573a",  // The Word Alive
  ],
  artistNames: ["VOILÀ", "The Word Alive"],
};

// ─── MusicBrainz Social Links ──────────────────────────────────────
export const MOCK_MUSICBRAINZ_SOCIAL_VOILA = [
  { platform: "Instagram",  url: "https://www.instagram.com/wearevoila/" },
  { platform: "Twitter/X",  url: "https://twitter.com/wearevoila" },
  { platform: "Facebook",   url: "https://www.facebook.com/wearevoila" },
  { platform: "YouTube",    url: "https://www.youtube.com/channel/UCpHoi3I_CIXSq1iEIGpaA3g" },
  { platform: "TikTok",     url: "https://www.tiktok.com/@wearevoila" },
  { platform: "SoundCloud", url: "https://soundcloud.com/wearevoila" },
  { platform: "Spotify",    url: "https://open.spotify.com/artist/6NnBBumbcMYsaPTHFhPtXD" },
  { platform: "Deezer",     url: "https://www.deezer.com/artist/74163" },
  { platform: "Website",    url: "https://www.wearevoila.com/" },
];

export const MOCK_MUSICBRAINZ_SOCIAL_TWA = [
  { platform: "Instagram",  url: "https://www.instagram.com/thewordalive/" },
  { platform: "Twitter/X",  url: "https://twitter.com/thewordalive" },
  { platform: "Facebook",   url: "https://www.facebook.com/thewordalive" },
  { platform: "YouTube",    url: "https://www.youtube.com/channel/UCoi1iAjO1KEpLOtlbtqIp_Q" },
  { platform: "TikTok",     url: "https://www.tiktok.com/@thewordaliveband" },
  { platform: "SoundCloud", url: "https://soundcloud.com/thewordalive" },
  { platform: "Spotify",    url: "https://open.spotify.com/artist/1CF8aEN939swnuIZGFI7Hk" },
  { platform: "Deezer",     url: "https://www.deezer.com/artist/326481" },
  { platform: "Website",    url: "https://www.wearethewordalive.com/" },
];

// ─── Deezer Track (by ISRC) ────────────────────────────────────────
export const MOCK_DEEZER_TRACK = {
  id: 2969950361,
  title: "Ballerina (with The Word Alive)",
  isrc: "QM24S2405530",
  link: "https://www.deezer.com/track/2969950361",
  duration: 215,
  artist: {
    id: 74163,
    name: "Voila",
    link: "https://www.deezer.com/artist/74163",
  },
  album: {
    id: 635924541,
    title: "Ballerina",
    cover_xl: "https://cdn-images.dzcdn.net/images/cover/cde0e8348eaac291c50febcfdd154e75/1000x1000-000000-80-0-0.jpg",
  },
  contributors: [],
};

// ─── Deezer Result (processed) ─────────────────────────────────────
export const MOCK_DEEZER_RESULT = {
  link: "https://www.deezer.com/track/2969950361",
  cover: "https://cdn-images.dzcdn.net/images/cover/cde0e8348eaac291c50febcfdd154e75/1000x1000-000000-80-0-0.jpg",
  albumName: "Ballerina",
  artists: ["Voila"],
  artistLinks: [{ name: "Voila", url: "https://www.deezer.com/artist/74163" }],
};

// ─── Odesli (song.link) Response ──────────────────────────────────
export const MOCK_ODESLI_RESULT = {
  pageUrl: "https://song.link/d/2969950361",
  platforms: {
    deezer: "https://www.deezer.com/track/2969950361",
    appleMusic: null,
    spotify: null,
    youtube: null,
    amazonMusic: "https://music.amazon.com/albums/B0DH8MMLGG?trackAsin=B0DH8L59FB",
    soundcloud: null,
    tidal: "https://listen.tidal.com/track/384167138",
  },
};

// ─── Expected Final ProjectCreateInput ─────────────────────────────
export const MOCK_EXPECTED_PROJECT_INPUT = {
  artistName: ["VOILÀ", "The Word Alive"],
  trackName: "Ballerina (with The Word Alive)",
  coverUrl: "https://cdn-images.dzcdn.net/images/cover/cde0e8348eaac291c50febcfdd154e75/1000x1000-000000-80-0-0.jpg",
  isrcs: "QM24S2405530",
  albumName: "VOILÀ",  // from LRCLIB, takes priority
  songLinkUrl: "https://song.link/d/2969950361",
  artistLinks: [{ name: "Voila", url: "https://www.deezer.com/artist/74163" }],
};

// ─── Raw LRC string for LRCLIB API mock ────────────────────────────
export const MOCK_LRC_RAW = MOCK_LRCLIB_RESULT.syncedLyrics;

/**
 * Helper to create a mock LRCLIB search response array
 */
export function mockLrcLibSearchResponse(query: string): LRCLibResult[] {
  if (query.toLowerCase().includes("ballerina")) {
    return [MOCK_LRCLIB_RESULT];
  }
  return [];
}
