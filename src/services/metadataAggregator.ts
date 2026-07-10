import { searchMusicBrainzRecording, fetchArtistSocialLinks } from "./musicbrainz";
import { fetchDeezerByISRC, fetchDeezerByName, type DeezerResult } from "./deezer";
import { fetchOdesliUrls } from "./odesli";
import { processLyricsMap } from "@/lib/lyricsParser";
import { getArtistName } from "@/lib/artistParser";
import { API } from "@/lib/apiConfig";
import { optimizeCoverUrl } from "@/lib/coverUtils";
import type { LyricLine, ProjectCreateInput } from "@/types/project";
import type { LRCLibResult } from "@/types/music";

// ---------------------------------------------------------------------------
// Pipeline types
// ---------------------------------------------------------------------------

interface ExtractionDependencies {
  searchMusicBrainzRecording: typeof searchMusicBrainzRecording;
  fetchArtistSocialLinks: typeof fetchArtistSocialLinks;
  fetchDeezerByISRC: typeof fetchDeezerByISRC;
  fetchDeezerByName: typeof fetchDeezerByName;
  fetchOdesliUrls: typeof fetchOdesliUrls;
}

interface ExtractionContext {
  artistName: string;
  trackName: string;
  albumName?: string;
  lyrics: Record<string, LyricLine>;
  artistNames: string[];
  artistMbids: string[];
  isrc: string | null;
  coverUrl?: string;
  streamingSites?: Record<string, string | null>;
  songLinkUrl?: string;
  artistLinks?: Array<{ name: string; url: string }>;
  socialMediaLinks: Array<{ platform: string; url: string; artistName?: string }>;
}

// ---------------------------------------------------------------------------
// Pipeline step functions — each does exactly one transformation
// ---------------------------------------------------------------------------

/** Step: Extract lyrics and album name from LRCLIB result. */
async function extractLyricsFromLrc(
  ctx: ExtractionContext,
  lrcResult?: LRCLibResult,
): Promise<ExtractionContext> {
  if (!lrcResult) return ctx;
  const next = { ...ctx };
  if (lrcResult.albumName) next.albumName = lrcResult.albumName;
  const lyricsStr = lrcResult.syncedLyrics || lrcResult.plainLyrics;
  if (lyricsStr) {
    const map = processLyricsMap(lyricsStr);
    if (map) next.lyrics = Object.fromEntries(map);
  }
  return next;
}

/** Step: Resolve artists, ISRC, and MBIDs via MusicBrainz. */
async function resolveArtistsViaMusicBrainz(
  ctx: ExtractionContext,
  deps: Pick<ExtractionDependencies, "searchMusicBrainzRecording">,
): Promise<ExtractionContext> {
  const parsedArtists = getArtistName(ctx.artistName);
  const searchArtist = parsedArtists.length > 1
    ? `${parsedArtists[0]}, ${parsedArtists[1]}`
    : (parsedArtists[0] ?? ctx.artistName);

  const { isrc, artistMbids, artistNames: mbArtistNames } = await deps.searchMusicBrainzRecording(searchArtist, ctx.trackName);

  const next = { ...ctx, isrc, artistMbids };
  if (mbArtistNames.length > 0) {
    next.artistNames = mbArtistNames;
  }
  return next;
}

/** Step: Resolve social media links from MusicBrainz artist MBIDs (max 3). */
async function resolveSocialMediaLinks(
  ctx: ExtractionContext,
  deps: Pick<ExtractionDependencies, "fetchArtistSocialLinks">,
): Promise<ExtractionContext> {
  const links: Array<{ platform: string; url: string; artistName?: string }> = [];

  for (let i = 0; i < Math.min(ctx.artistMbids.length, 3); i++) {
    const artistLinks = await deps.fetchArtistSocialLinks(ctx.artistMbids[i]);
    const artistName = ctx.artistNames[i];
    for (const link of artistLinks) {
      links.push({ ...link, artistName });
    }
  }

  const seenUrls = new Set<string>();
  const deduped = links.filter((s) => {
    if (seenUrls.has(s.url)) return false;
    seenUrls.add(s.url);
    return true;
  });

  return { ...ctx, socialMediaLinks: deduped };
}

/** Step: Resolve cover art, album, and streaming links from Deezer via ISRC (with optional worker). */
async function resolveCoverFromDeezer(
  ctx: ExtractionContext,
  deps: Pick<ExtractionDependencies, "fetchDeezerByISRC" | "fetchOdesliUrls">,
): Promise<ExtractionContext> {
  if (!ctx.isrc) return ctx;

  const workerResult = API.metadata
    ? await fetchMetadataFromWorker(ctx.isrc)
    : null;

  const deezerResult = workerResult
    ? workerResult.deezer
    : await deps.fetchDeezerByISRC(ctx.isrc);

  if (!deezerResult) return ctx;

  const next = { ...ctx };
  next.coverUrl = deezerResult.cover;
  if (!next.albumName) next.albumName = deezerResult.albumName;
  if (next.artistNames.length === 0 && deezerResult.artists && deezerResult.artists.length > 0) {
    next.artistNames = deezerResult.artists;
  }
  if (deezerResult.artistLinks) next.artistLinks = deezerResult.artistLinks;

  // Default streaming sites from Deezer
  next.streamingSites = {
    deezer: deezerResult.link,
    spotify: null,
    appleMusic: null,
    youtube: null,
    amazonMusic: null,
    soundcloud: null,
    tidal: null,
  };
  next.songLinkUrl = deezerResult.link;

  // Prefer Odesli streaming links if available
  if (workerResult?.odesli) {
    next.streamingSites = workerResult.odesli.platforms;
    next.songLinkUrl = workerResult.odesli.pageUrl ?? deezerResult.link;
  } else if (!API.metadata) {
    const odesli = await deps.fetchOdesliUrls(deezerResult.link);
    if (odesli) {
      next.streamingSites = odesli.platforms;
      next.songLinkUrl = odesli.pageUrl ?? deezerResult.link;
    }
  }

  return next;
}

/** Step: Fallback to Deezer by name if no cover was found via ISRC. */
async function fallbackToDeezerByName(
  ctx: ExtractionContext,
  deps: Pick<ExtractionDependencies, "fetchDeezerByName" | "fetchOdesliUrls">,
): Promise<ExtractionContext> {
  if (ctx.coverUrl) return ctx;

  const deezerByName = await deps.fetchDeezerByName(
    ctx.artistNames[0] ?? ctx.artistName,
    ctx.trackName,
  );
  if (!deezerByName) return ctx;

  const next = { ...ctx };
  next.coverUrl = deezerByName.cover;
  if (!next.albumName) next.albumName = deezerByName.albumName;
  if (next.artistNames.length === 0 && deezerByName.artists && deezerByName.artists.length > 0) {
    next.artistNames = deezerByName.artists;
  }
  if (deezerByName.artistLinks) next.artistLinks = deezerByName.artistLinks;

  if (!next.streamingSites) {
    next.streamingSites = {
      deezer: deezerByName.link,
      spotify: null,
      appleMusic: null,
      youtube: null,
      amazonMusic: null,
      soundcloud: null,
      tidal: null,
    };
    next.songLinkUrl = deezerByName.link;
    const odesli = await deps.fetchOdesliUrls(deezerByName.link);
    if (odesli) {
      next.streamingSites = odesli.platforms;
      next.songLinkUrl = odesli.pageUrl ?? deezerByName.link;
    }
  }

  return next;
}

/** Step: Optimize the cover URL — tries 500x500 webp, falls back to 500x500 jpg. */
async function optimizeCoverArt(ctx: ExtractionContext): Promise<ExtractionContext> {
  if (!ctx.coverUrl) return ctx;
  const optimized = await optimizeCoverUrl(ctx.coverUrl);
  return { ...ctx, coverUrl: optimized };
}

/** Step: Ensure artist names are populated (last resort from LRCLIB or input). */
function ensureArtistNames(ctx: ExtractionContext, lrcResult?: LRCLibResult): ExtractionContext {
  if (ctx.artistNames.length > 0) return ctx;

  const fallbackNames = lrcResult
    ? getArtistName(lrcResult.artistName)
    : [ctx.artistName];

  return { ...ctx, artistNames: fallbackNames };
}

/** Step: Build the final ProjectCreateInput from the accumulated context. */
function buildProjectInput(ctx: ExtractionContext): ProjectCreateInput {
  return {
    artistName: ctx.artistNames,
    trackName: ctx.trackName,
    lyrics: ctx.lyrics,
    coverUrl: ctx.coverUrl,
    isrcs: ctx.isrc ?? undefined,
    streamingSites: ctx.streamingSites,
    albumName: ctx.albumName,
    songLinkUrl: ctx.songLinkUrl,
    artistLinks: ctx.artistLinks,
    recommendedSocialLinks: ctx.socialMediaLinks.length > 0 ? ctx.socialMediaLinks : undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API — preserved signature for backward compatibility
// ---------------------------------------------------------------------------

export async function getFullMetadata(
  artistName: string,
  trackName: string,
  lrcResult?: LRCLibResult,
): Promise<ProjectCreateInput> {
  const deps: ExtractionDependencies = {
    searchMusicBrainzRecording,
    fetchArtistSocialLinks,
    fetchDeezerByISRC,
    fetchDeezerByName,
    fetchOdesliUrls,
  };

  const initialContext: ExtractionContext = {
    artistName,
    trackName,
    lyrics: {},
    artistNames: [],
    artistMbids: [],
    isrc: null,
    socialMediaLinks: [],
  };

  // Run the pipeline — each step takes the previous context and returns an
  // enriched copy.  Order is significant and matches the original logic.
  let ctx = await extractLyricsFromLrc(initialContext, lrcResult);
  ctx = await resolveArtistsViaMusicBrainz(ctx, deps);
  ctx = await resolveSocialMediaLinks(ctx, deps);
  ctx = await resolveCoverFromDeezer(ctx, deps);
  ctx = await fallbackToDeezerByName(ctx, deps);
  ctx = await optimizeCoverArt(ctx);
  ctx = ensureArtistNames(ctx, lrcResult);

  return buildProjectInput(ctx);
}

// ---------------------------------------------------------------------------
// Worker metadata helper (from Wave 1) — unchanged
// ---------------------------------------------------------------------------

interface WorkerMetadataResult {
  deezer: DeezerResult;
  odesli?: {
    platforms: Record<string, string | null>;
    pageUrl?: string;
  };
}

async function fetchMetadataFromWorker(isrc: string): Promise<WorkerMetadataResult | null> {
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

    // Build odesli result from worker response
    let odesliResult = undefined;
    const odesliData = data?.odesli;
    if (odesliData) {
      const platforms = odesliData.linksByPlatform ?? {};
      odesliResult = {
        platforms: {
          deezer: platforms?.deezer?.url ?? null,
          appleMusic: platforms?.appleMusic?.url ?? null,
          spotify: platforms?.spotify?.url ?? null,
          youtube: platforms?.youtube?.url ?? null,
          amazonMusic: platforms?.amazonMusic?.url ?? null,
          soundcloud: platforms?.soundcloud?.url ?? null,
          tidal: platforms?.tidal?.url ?? null,
        },
        pageUrl: odesliData.pageUrl,
      };
    }

    return {
      deezer: {
        link: track.link,
        cover: track.album.cover_xl ?? "",
        albumName: track.album.title,
        artists: artists.length > 0 ? artists : undefined,
        artistLinks: artistLinks.length > 0 ? artistLinks : undefined,
      },
      odesli: odesliResult,
    };
  } catch {
    return null;
  }
}
