import { fetchISRC, fetchArtistSocialLinks } from "./musicbrainz";
import { fetchDeezerByISRC, fetchDeezerByName } from "./deezer";
import { fetchOdesliUrls } from "./odesli";
import { processLyricsMap } from "@/lib/lyricsParser";
import { getArtistName } from "@/lib/artistParser";
import type { LyricLine, ProjectCreateInput } from "@/types/project";
import type { LRCLibResult } from "@/types/music";

export async function getFullMetadata(
  artistName: string,
  trackName: string,
  lrcResult?: LRCLibResult,
): Promise<ProjectCreateInput> {
  let lyrics: Record<string, LyricLine> = {};
  // Artist hierarchy: 1. Deezer → 2. MusicBrainz → 3. LRCLIB
  let artistNames: string[] = [];
  let albumName: string | undefined;
  let songLinkUrl: string | undefined;
  let artistLinks: Array<{ name: string; url: string }> | undefined;

  // Layer 3: LRCLIB (base)
  if (lrcResult) {
    artistNames = getArtistName(lrcResult.artistName);
    albumName = lrcResult.albumName;
    const lyricsStr = lrcResult.syncedLyrics || lrcResult.plainLyrics;
    if (lyricsStr) {
      const map = processLyricsMap(lyricsStr);
      if (map) lyrics = Object.fromEntries(map);
    }
  }

  // Fallback if LRCLIB gave no artists
  if (artistNames.length === 0) {
    artistNames = [artistName];
  }

  // Layer 2: MusicBrainz → ISRC + artist MBIDs
  const { isrc, artistMbids } = await fetchISRC(artistNames[0]!, trackName);

  // Fetch social media links from MusicBrainz for each artist
  let socialMediaLinks: Array<{ platform: string; url: string }> = [];
  if (artistMbids.length > 0) {
    for (const mbid of artistMbids.slice(0, 3)) {
      const links = await fetchArtistSocialLinks(mbid);
      socialMediaLinks = [...socialMediaLinks, ...links];
    }
  }
  // Deduplicate by URL
  const seen = new Set<string>();
  socialMediaLinks = socialMediaLinks.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  let coverUrl: string | undefined;
  let streamingSites: Record<string, string | null> | undefined;

  // Layer 1: Deezer (richest data)
  if (isrc) {
    const deezer = await fetchDeezerByISRC(isrc);
    if (deezer) {
      coverUrl = deezer.cover;
      if (!albumName) albumName = deezer.albumName;
      // Deezer artists override LRCLIB (hierarchy rule)
      if (deezer.artists && deezer.artists.length > 0) {
        artistNames = deezer.artists;
      }
      // Collect artist links from Deezer
      if (deezer.artistLinks) {
        artistLinks = deezer.artistLinks;
      }
      const odesli = await fetchOdesliUrls(deezer.link);
      if (odesli) {
        streamingSites = odesli.platforms;
        songLinkUrl = odesli.pageUrl;
      }
    }
  }

  if (!coverUrl) {
    const deezerByName = await fetchDeezerByName(artistNames[0]!, trackName);
    if (deezerByName) {
      coverUrl = deezerByName.cover;
      if (!albumName) albumName = deezerByName.albumName;
      if (deezerByName.artists && deezerByName.artists.length > 0) {
        artistNames = deezerByName.artists;
      }
      if (deezerByName.artistLinks) {
        artistLinks = deezerByName.artistLinks;
      }
      if (!streamingSites) {
        const odesli = await fetchOdesliUrls(deezerByName.link);
        if (odesli) {
          streamingSites = odesli.platforms;
          songLinkUrl = odesli.pageUrl;
        }
      }
    }
  }

  return {
    artistName: artistNames,
    trackName,
    lyrics,
    coverUrl,
    isrcs: isrc ?? undefined,
    streamingSites,
    albumName,
    songLinkUrl,
    artistLinks,
    recommendedSocialLinks: socialMediaLinks.length > 0 ? socialMediaLinks : undefined,
  };
}
