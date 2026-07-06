import { fetchISRC, fetchArtistSocialLinks } from "./musicbrainz";
import { fetchDeezerByISRC, fetchDeezerByName, type DeezerResult } from "./deezer";
import { fetchOdesliUrls } from "./odesli";
import { processLyricsMap } from "@/lib/lyricsParser";
import { getArtistName } from "@/lib/artistParser";
import { API } from "@/lib/apiConfig";
import type { LyricLine, ProjectCreateInput } from "@/types/project";
import type { LRCLibResult } from "@/types/music";

export async function getFullMetadata(
  artistName: string,
  trackName: string,
  lrcResult?: LRCLibResult,
): Promise<ProjectCreateInput> {
  let lyrics: Record<string, LyricLine> = {};
  let artistNames: string[] = [];
  let albumName: string | undefined;
  let songLinkUrl: string | undefined;
  let artistLinks: Array<{ name: string; url: string }> | undefined;

  // Lyrics + album from LRCLIB
  if (lrcResult) {
    albumName = lrcResult.albumName;
    const lyricsStr = lrcResult.syncedLyrics || lrcResult.plainLyrics;
    if (lyricsStr) {
      const map = processLyricsMap(lyricsStr);
      if (map) lyrics = Object.fromEntries(map);
    }
  }

  // Layer 1: MusicBrainz recording → artists (primary), ISRC, MBIDs
  const parsedArtists = getArtistName(artistName);
  const searchArtist = parsedArtists.length > 1
    ? `${parsedArtists[0]}, ${parsedArtists[1]}`
    : (parsedArtists[0] ?? artistName);
  const { isrc, artistMbids, artistNames: mbArtistNames } = await fetchISRC(searchArtist, trackName);
  if (mbArtistNames.length > 0) {
    artistNames = mbArtistNames;
  }

  // Social media from MusicBrainz per artist MBID
  let socialMediaLinks: Array<{ platform: string; url: string; artistName?: string }> = [];
  if (artistMbids.length > 0) {
    for (let i = 0; i < Math.min(artistMbids.length, 3); i++) {
      const links = await fetchArtistSocialLinks(artistMbids[i]);
      const artist = mbArtistNames[i];
      for (const link of links) {
        socialMediaLinks.push({ ...link, artistName: artist });
      }
    }
  }
  const seenUrls = new Set<string>();
  socialMediaLinks = socialMediaLinks.filter((s) => {
    if (seenUrls.has(s.url)) return false;
    seenUrls.add(s.url);
    return true;
  });

  let coverUrl: string | undefined;
  let streamingSites: Record<string, string | null> | undefined;

  // Layer 2: Deezer (cover, album, artists fallback, artist links, streaming)
  if (isrc) {
    const deezer = API.metadata
      ? await fetchMetadataFromWorker(isrc)
      : await fetchDeezerByISRC(isrc);
    if (deezer) {
      coverUrl = deezer.cover;
      if (!albumName) albumName = deezer.albumName;
      if (artistNames.length === 0 && deezer.artists && deezer.artists.length > 0) {
        artistNames = deezer.artists;
      }
      if (deezer.artistLinks) artistLinks = deezer.artistLinks;
      streamingSites = { deezer: deezer.link, spotify: null, appleMusic: null, youtube: null, amazonMusic: null, soundcloud: null, tidal: null };
      songLinkUrl = deezer.link;
      if (!API.metadata) {
        const odesli = await fetchOdesliUrls(deezer.link);
        if (odesli) {
          streamingSites = odesli.platforms;
          songLinkUrl = odesli.pageUrl ?? deezer.link;
        }
      }
    }
  }

  // Layer 3: Deezer by name fallback (only if no cover yet)
  if (!coverUrl) {
    const deezerByName = await fetchDeezerByName(artistNames[0] ?? artistName, trackName);
    if (deezerByName) {
      coverUrl = deezerByName.cover;
      if (!albumName) albumName = deezerByName.albumName;
      if (artistNames.length === 0 && deezerByName.artists && deezerByName.artists.length > 0) {
        artistNames = deezerByName.artists;
      }
      if (deezerByName.artistLinks) artistLinks = deezerByName.artistLinks;
      if (!streamingSites) {
        streamingSites = { deezer: deezerByName.link, spotify: null, appleMusic: null, youtube: null, amazonMusic: null, soundcloud: null, tidal: null };
        songLinkUrl = deezerByName.link;
        const odesli = await fetchOdesliUrls(deezerByName.link);
        if (odesli) {
          streamingSites = odesli.platforms;
          songLinkUrl = odesli.pageUrl ?? deezerByName.link;
        }
      }
    }
  }

  // Layer 4: LRCLIB artist name (last resort)
  if (artistNames.length === 0) {
    artistNames = lrcResult
      ? getArtistName(lrcResult.artistName)
      : [artistName];
  }
  if (artistNames.length === 0) {
    artistNames = [artistName];
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

async function fetchMetadataFromWorker(isrc: string): Promise<DeezerResult | null> {
  try {
    const res = await fetch(`${API.metadata}?isrc=${encodeURIComponent(isrc)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const track = data?.deezer;
    if (!track?.album) return null;
    const artists: string[] = [];
    const artistLinks: Array<{ name: string; url: string }> = [];
    if (track.artist?.name) {
      artists.push(track.artist.name);
      if (track.artist.link) artistLinks.push({ name: track.artist.name, url: track.artist.link });
    }
    track.contributors?.forEach((c: { name: string; link?: string }) => {
      if (c.name !== track.artist?.name) artists.push(c.name);
      if (c.link) artistLinks.push({ name: c.name, url: c.link });
    });
    return {
      link: track.link,
      cover: track.album.cover_xl ?? "",
      albumName: track.album.title,
      artists: artists.length > 0 ? artists : undefined,
      artistLinks: artistLinks.length > 0 ? artistLinks : undefined,
    };
  } catch {
    return null;
  }
}
