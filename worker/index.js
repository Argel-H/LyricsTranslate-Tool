// ============================================================================
// Shared Constants & Utilities
// ============================================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

const MAX_QUERY_ARTISTS = 3;
const FETCH_DELAY_MS = 1100;
const MB_CACHE_TTL_SECONDS = 86400;
const INCOMPLETE_CACHE_TTL_SECONDS = 3600;
const MB_CACHE_KEY_PREFIX = "https://mb-social/";
const MUSICBRAINZ_ARTIST_URL = "https://musicbrainz.org/ws/2/artist";
const MUSICBRAINZ_USER_AGENT_BASE = "LyricsTranslate-Tool/0.0.7 (lyricstranslate@tool.com)";

// MusicBrainz serves requests from shared Cloudflare IPs, so we append a short
// per-request suffix to avoid being grouped into a single rate-limit bucket.
function musicBrainzUserAgent() {
  return `${MUSICBRAINZ_USER_AGENT_BASE} CFWorker/${crypto.randomUUID().substring(0, 8)}`;
}

// MusicBrainz signals throttling with 503 (occasionally 429). A throttled
// request yields partial/empty data, so callers must not cache its result.
function isMusicBrainzRateLimited(status) {
  return status === 429 || status === 503;
}

const RELATION_TYPE_MAP = {
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

const FULL_METADATA_CACHE_KEY_PREFIX = "https://full-metadata/v2/";
const MUSICBRAINZ_RECORDING_URL = "https://musicbrainz.org/ws/2/recording/";
const DEEZER_TRACK_URL = "https://api.deezer.com/2.0/track/isrc:";
const DEEZER_SEARCH_URL = "https://api.deezer.com/search/track";
const DEEZER_TRACK_BY_ID_URL = "https://api.deezer.com/track/";
const ODESLI_LINKS_URL = "https://api.song.link/v1-alpha.1/links";
const COVER_ART_ARCHIVE_BASE = "https://coverartarchive.org/release/";

const DEEZER_CDN_RE = /^https:\/\/cdn-images\.dzcdn\.net\/images\/cover\/([a-f0-9]+)\//;
const COVER_HEAD_TIMEOUT_MS = 5000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheableJsonResponse(data, ttlSeconds) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `public, max-age=${ttlSeconds}`,
    },
  });
}

export function normalizeForMatch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function nameSimilarity(candidate, wanted) {
  if (!candidate || !wanted) return 0;
  if (candidate === wanted) return 2;
  if (candidate.includes(wanted) || wanted.includes(candidate)) return 1;
  return 0;
}

function bestArtistSimilarity(candidates, wantedArtists) {
  let best = 0;
  for (const wanted of wantedArtists) {
    for (const candidate of candidates) {
      best = Math.max(best, nameSimilarity(candidate, wanted));
    }
  }
  return best;
}

function matchScore({ title, artists }, wantedTitle, wantedArtists) {
  const titleScore = nameSimilarity(normalizeForMatch(title), wantedTitle);
  if (titleScore === 0) return 0;

  const artistScore = bestArtistSimilarity(artists.map(normalizeForMatch), wantedArtists);
  if (wantedArtists.length > 0 && artistScore === 0) return 0;
  if (wantedArtists.length === 0 && titleScore < 2) return 0;

  return titleScore * 10 + artistScore;
}

function pickBestMatch(items, artistNames, trackName, toMatchInfo) {
  const wantedTitle = normalizeForMatch(trackName);
  const wantedArtists = artistNames.map(normalizeForMatch).filter(Boolean);
  let best = null;
  let bestScore = 0;

  for (const item of items) {
    const score = matchScore(toMatchInfo(item), wantedTitle, wantedArtists);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

function deezerTrackMatchInfo(track) {
  return {
    title: track.title,
    artists: [track.artist?.name, ...(track.contributors ?? []).map((contributor) => contributor.name)],
  };
}

function musicBrainzRecordingMatchInfo(recording) {
  return {
    title: recording.title,
    artists: (recording["artist-credit"] ?? []).map((credit) => credit.name ?? credit.artist?.name),
  };
}

export function pickBestDeezerTrack(tracks, artistNames, trackName) {
  return pickBestMatch(tracks, artistNames, trackName, deezerTrackMatchInfo);
}

export function pickBestRecording(recordings, artistNames, trackName) {
  return pickBestMatch(recordings, artistNames, trackName, musicBrainzRecordingMatchInfo);
}

function platformFromUrl(url) {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    const patterns = [
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

function extractSocialLinks(artist) {
  const seen = new Set();
  const links = [];
  artist?.relations?.forEach((rel) => {
    const resource = rel.url?.resource;
    if (!resource) return;
    const typePlatform = RELATION_TYPE_MAP[rel.type];
    const platform =
      typePlatform && typePlatform !== "Streaming" && typePlatform !== "Social"
        ? typePlatform
        : platformFromUrl(resource);
    if (platform && !seen.has(platform)) {
      seen.add(platform);
      links.push({ platform, url: resource });
    }
  });
  return links;
}

// ============================================================================
// Sharing System Management
// ============================================================================

async function handleShareCreate(request, env) {
  try {
    const content = await request.text();
    if (!content) {
      return new Response("Empty body", { status: 400, headers: CORS_HEADERS });
    }

    const id = crypto.randomUUID().substring(0, 8);

    // Save to KV, 30 days expiration
    await env.SUBS_PASTES.put(id, content, { expirationTtl: 2592000 });

    const url = new URL(request.url);
    return new Response(`${url.origin}/share/${id}`, {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
    });
  } catch (err) {
    return new Response(`Worker error: ${err.message}`, { status: 500, headers: CORS_HEADERS });
  }
}

async function handleShareRetrieve(id, env) {
  if (!id) {
    return new Response("Missing paste ID", { status: 400, headers: CORS_HEADERS });
  }

  try {
    const content = await env.SUBS_PASTES.get(id);
    if (!content) {
      return new Response("Paste not found or expired", {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    return new Response(content, {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
    });
  } catch (err) {
    return new Response(`Worker error: ${err.message}`, { status: 500, headers: CORS_HEADERS });
  }
}

// ============================================================================
// Full Metadata Orchestrator
// ============================================================================

async function handleFullMetadata(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const rawArtistNames = Array.isArray(body?.artistNames) ? body.artistNames : [];
    const artistNames = rawArtistNames.map((name) => String(name).trim()).filter(Boolean);
    const trackName = typeof body?.trackName === "string" ? body.trackName.trim() : "";
    if (!trackName) {
      return json({ error: "Missing trackName" }, 400);
    }
    const albumName =
      typeof body?.albumName === "string" && body.albumName.trim() !== ""
        ? body.albumName.trim()
        : undefined;

    const cacheKey =
      FULL_METADATA_CACHE_KEY_PREFIX +
      encodeURIComponent(artistNames.join("|")) +
      ":" +
      encodeURIComponent(trackName);
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      return cached;
    }

    const {
      isrc,
      artistMbids,
      artistNames: mbArtistNames,
      trackTitle,
      releaseId,
      rateLimited: recordingRateLimited,
    } = await fetchMusicBrainzRecording(artistNames, trackName);

    const [socialResult, isrcResult] = await Promise.all([
      artistMbids.length > 0
        ? resolveSocialLinksBatch(artistMbids)
        : Promise.resolve({ results: {}, rateLimited: false }),
      isrc ? resolveDeezerByIsrc(isrc) : Promise.resolve({ deezer: null, odesli: null }),
    ]);
    const socialByMbid = socialResult.results;
    const socialRateLimited = socialResult.rateLimited;

    const { coverUrl, nameDeezer, nameOdesli, isrcFromDeezer } = await resolveCover({
      isrcResult,
      artistNames,
      trackTitle,
      trackName,
      releaseId,
    });
    const finalIsrc = isrc || isrcFromDeezer;

    const result = assembleFullMetadata({
      inputArtistName: artistNames[0] ?? "",
      inputTrackName: trackName,
      inputAlbumName: albumName,
      isrc: finalIsrc,
      artistMbids,
      artistNames: mbArtistNames,
      trackTitle,
      socialByMbid,
      isrcDeezer: isrcResult.deezer,
      isrcOdesli: isrcResult.odesli,
      nameDeezer,
      nameOdesli,
      coverUrl,
    });

    const rateLimited = recordingRateLimited || socialRateLimited;
    const isIncomplete = !finalIsrc && !coverUrl;
    const cacheTtlSeconds = isIncomplete ? INCOMPLETE_CACHE_TTL_SECONDS : MB_CACHE_TTL_SECONDS;

    if (!rateLimited) {
      await caches.default.put(cacheKey, cacheableJsonResponse(result, cacheTtlSeconds));
    }

    return json(result);
  } catch (err) {
    console.error("handleFullMetadata: unexpected failure:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

async function resolveDeezerByIsrc(isrc) {
  const deezer = await fetchDeezerByISRC(isrc);
  if (!deezer?.link) return { deezer: null, odesli: null };
  const odesli = await fetchOdesliUrls(deezer.link);
  return { deezer, odesli };
}

async function resolveCover({ isrcResult, artistNames, trackTitle, trackName, releaseId }) {
  if (isrcResult.deezer?.cover) {
    return {
      coverUrl: await optimizeCoverUrl(isrcResult.deezer.cover),
      nameDeezer: null,
      nameOdesli: null,
      isrcFromDeezer: null,
    };
  }

  const nameDeezer = await fetchDeezerByName(artistNames, trackTitle ?? trackName);
  const nameOdesli = nameDeezer?.link ? await fetchOdesliUrls(nameDeezer.link) : null;
  const rawCoverUrl = nameDeezer?.cover || (await fetchCoverArtArchiveUrl(releaseId));

  return {
    coverUrl: rawCoverUrl ? await optimizeCoverUrl(rawCoverUrl) : "",
    nameDeezer,
    nameOdesli,
    isrcFromDeezer: nameDeezer?.isrc ?? null,
  };
}

async function searchMusicBrainzRecordings(query, limit) {
  const url = new URL(MUSICBRAINZ_RECORDING_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, {
    headers: {
      "User-Agent": musicBrainzUserAgent(),
      Accept: "application/json",
    },
  });
  if (isMusicBrainzRateLimited(response.status)) {
    return { recordings: [], rateLimited: true };
  }
  if (!response.ok) {
    return { recordings: [], rateLimited: false };
  }
  const data = await response.json();
  return { recordings: data?.recordings ?? [], rateLimited: false };
}

function emptyMusicBrainzResult(rateLimited = false) {
  return { isrc: null, artistMbids: [], artistNames: [], trackTitle: null, releaseId: null, rateLimited };
}

function recordingToResult(recording) {
  const artistMbids = [];
  const artistNames = [];
  recording["artist-credit"]?.forEach((credit) => {
    if (credit.artist?.id) {
      artistMbids.push(credit.artist.id);
      artistNames.push(credit.name);
    }
  });
  return {
    isrc: recording.isrcs?.[0] ?? null,
    artistMbids,
    artistNames,
    trackTitle: recording.title ?? null,
    releaseId: recording.releases?.[0]?.id ?? null,
    rateLimited: false,
  };
}

async function fetchMusicBrainzRecording(artistNames, trackName) {
  const searches = artistNames
    .slice(0, MAX_QUERY_ARTISTS)
    .map((artist) => ({ query: `artist:'${artist}' AND recording:'${trackName}'`, artists: [artist] }));
  searches.push({ query: `recording:'${trackName}'`, artists: artistNames });

  for (const [index, search] of searches.entries()) {
    if (index > 0) await sleep(FETCH_DELAY_MS);

    let found;
    try {
      found = await searchMusicBrainzRecordings(search.query, 5);
    } catch (err) {
      console.error("fetchMusicBrainzRecording failed:", err);
      continue;
    }
    if (found.rateLimited) return emptyMusicBrainzResult(true);

    const best = pickBestRecording(found.recordings, search.artists, trackName);
    if (best) return recordingToResult(best);
  }

  return emptyMusicBrainzResult();
}

async function resolveSocialLinksBatch(mbids) {
  const results = {};
  let rateLimited = false;
  let hasPendingFetch = false;

  for (const mbid of mbids) {
    try {
      const cacheKey = MB_CACHE_KEY_PREFIX + mbid;
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const cachedData = await cached.json();
        results[mbid] = { links: Array.isArray(cachedData.links) ? cachedData.links : [] };
        continue;
      }

      if (hasPendingFetch) {
        await sleep(FETCH_DELAY_MS);
      }
      hasPendingFetch = true;

      const response = await fetch(
        `${MUSICBRAINZ_ARTIST_URL}/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`,
        {
          headers: {
            "User-Agent": musicBrainzUserAgent(),
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        if (isMusicBrainzRateLimited(response.status)) rateLimited = true;
        throw new Error(`MusicBrainz responded with ${response.status} for ${mbid}`);
      }
      const data = await response.json();
      const links = extractSocialLinks(data);
      results[mbid] = { links };

      const cacheResponse = new Response(JSON.stringify({ links }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${MB_CACHE_TTL_SECONDS}`,
        },
      });
      await caches.default.put(cacheKey, cacheResponse);
    } catch (err) {
      console.error(`resolveSocialLinksBatch: failed for mbid ${mbid}:`, err);
      results[mbid] = { links: [] };
    }
  }

  return { results, rateLimited };
}

async function fetchDeezerByISRC(isrc) {
  try {
    const response = await fetch(DEEZER_TRACK_URL + encodeURIComponent(isrc));
    if (!response.ok) return null;
    const track = await response.json();
    // Deezer returns HTTP 200 with an `error` object for unknown ISRCs.
    if (!track || track.error) return null;
    const { artists, artistLinks } = extractDeezerArtists(track);
    return {
      link: track.link ?? null,
      cover: track.album?.cover_xl ?? "",
      albumName: track.album?.title ?? null,
      artists,
      artistLinks,
    };
  } catch (err) {
    console.error("fetchDeezerByISRC failed:", err);
    return null;
  }
}

async function searchDeezerTracks(query, limit) {
  const url = new URL(DEEZER_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data?.data) ? data.data : [];
}

async function hydrateDeezerTrack(trackId) {
  const response = await fetch(DEEZER_TRACK_BY_ID_URL + trackId);
  if (!response.ok) return null;
  const track = await response.json();
  if (!track || track.error) return null;
  const { artists, artistLinks } = extractDeezerArtists(track);
  return {
    isrc: track.isrc ?? null,
    link: track.link ?? null,
    cover: track.album?.cover_xl ?? "",
    albumName: track.album?.title ?? null,
    artists,
    artistLinks,
  };
}

function deezerQueries(artistNames, trackName) {
  const primaryArtist = artistNames[0] ?? "";
  const queries = [];
  if (primaryArtist) {
    queries.push(`artist:"${primaryArtist}" track:"${trackName}"`);
    queries.push(`${primaryArtist} ${trackName}`);
  }
  queries.push(trackName);
  return queries;
}

async function findBestDeezerTrack(query, artistNames, trackName) {
  try {
    const tracks = await searchDeezerTracks(query, 10);
    const best = pickBestDeezerTrack(tracks, artistNames, trackName);
    return best ? await hydrateDeezerTrack(best.id) : null;
  } catch (err) {
    console.error("fetchDeezerByName failed:", err);
    return null;
  }
}

async function fetchDeezerByName(artistNames, trackName) {
  for (const query of deezerQueries(artistNames, trackName)) {
    const best = await findBestDeezerTrack(query, artistNames, trackName);
    if (best) return best;
  }
  return null;
}

async function fetchOdesliUrls(deezerLink) {
  if (!deezerLink) return null;
  try {
    const url = new URL(ODESLI_LINKS_URL);
    url.searchParams.set("url", deezerLink);
    const response = await fetch(url);
    if (!response.ok) return null;
    const odesliData = await response.json();
    const platforms = odesliData.linksByPlatform ?? {};
    return {
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
  } catch (err) {
    console.error("fetchOdesliUrls failed:", err);
    return null;
  }
}

async function fetchCoverArtArchiveUrl(releaseId) {
  if (!releaseId) return "";
  const url = `${COVER_ART_ARCHIVE_BASE}${releaseId}/front-500`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COVER_HEAD_TIMEOUT_MS);
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok ? url : "";
  } catch {
    return "";
  }
}

async function optimizeCoverUrl(url) {
  if (typeof url !== "string" || !url) return url ?? "";
  const match = url.match(DEEZER_CDN_RE);
  if (!match) return url;

  const hash = match[1];
  const webpUrl = `https://cdn-images.dzcdn.net/images/cover/${hash}/500x500-000000-80-0-0.webp`;
  const jpgUrl = `https://cdn-images.dzcdn.net/images/cover/${hash}/500x500-000000-80-0-0.jpg`;

  // Try webp first with a short HEAD request; fall back to jpg on any failure.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COVER_HEAD_TIMEOUT_MS);
    const response = await fetch(webpUrl, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) return webpUrl;
  } catch {
    // HEAD failed (timeout, 404, network) - fall through to jpg.
  }

  return jpgUrl;
}

function extractDeezerArtists(track) {
  const artists = [];
  const artistLinks = [];
  if (track.artist?.name) {
    artists.push(track.artist.name);
    if (track.artist.link) {
      artistLinks.push({ name: track.artist.name, url: track.artist.link });
    }
  }
  track.contributors?.forEach((c) => {
    if (c.name !== track.artist?.name) {
      artists.push(c.name);
      if (c.link) {
        artistLinks.push({ name: c.name, url: c.link });
      }
    }
  });
  return { artists, artistLinks };
}

function assembleFullMetadata({
  inputArtistName,
  inputTrackName,
  inputAlbumName,
  isrc,
  artistMbids,
  artistNames,
  trackTitle,
  socialByMbid,
  isrcDeezer,
  isrcOdesli,
  nameDeezer,
  nameOdesli,
  coverUrl,
}) {
  const result = {
    trackName: trackTitle || inputTrackName,
    artistNames,
    artistMbids,
    isrc,
    coverUrl,
  };

  // The by-name Deezer result only exists when the ISRC path produced no
  // cover, so `??` is safe - the ISRC result wins when both exist.
  const deezerTrack = isrcDeezer ?? nameDeezer;
  // If MusicBrainz found no artist names (e.g. title-only search), adopt the
  // Deezer track's artist list so the response still carries an artist.
  if (result.artistNames.length === 0 && deezerTrack?.artists?.length) {
    result.artistNames = deezerTrack.artists;
  }
  const odesli = isrcOdesli ?? nameOdesli;

  // albumName: prefer Deezer's authoritative album title, fall back to the
  // optional request input. Omit entirely when neither is available.
  const albumName = deezerTrack?.albumName || inputAlbumName;
  if (albumName) result.albumName = albumName;

  // streamingSites: Odesli platforms when available; otherwise a Deezer-link
  // object with nulls; otherwise an all-null object (never absent).
  result.streamingSites = odesli
    ? odesli.platforms
    : {
        deezer: deezerTrack?.link ?? null,
        spotify: null,
        appleMusic: null,
        youtube: null,
        amazonMusic: null,
        soundcloud: null,
        tidal: null,
      };

  // songLinkUrl: Odesli page when available, else the Deezer link. Omit when
  // neither exists.
  const songLinkUrl = odesli?.pageUrl ?? deezerTrack?.link;
  if (songLinkUrl) result.songLinkUrl = songLinkUrl;

  // artistLinks come from the winning Deezer track (ISRC lookup or fallback).
  result.artistLinks = deezerTrack?.artistLinks ?? [];

  // Social links from MusicBrainz artist relations, with the owning artist's
  // name attached (matching index) and deduplicated by URL.
  const socialLinks = [];
  const seenUrls = new Set();
  for (let i = 0; i < artistMbids.length; i++) {
    const entry = socialByMbid[artistMbids[i]];
    const socialArtistName = artistNames[i] ?? inputArtistName;
    for (const link of entry?.links ?? []) {
      if (seenUrls.has(link.url)) continue;
      seenUrls.add(link.url);
      socialLinks.push({ platform: link.platform, url: link.url, artistName: socialArtistName });
    }
  }
  result.socialLinks = socialLinks;

  return result;
}

// ============================================================================
// SECTION 4 - AI Proxy
// ============================================================================

async function proxy(request, targetUrl) {
  if (!targetUrl) return new Response("Missing target URL", { status: 400 });
  const headers = new Headers(request.headers);
  headers.delete("X-Target-URL");
  const response = await fetch(targetUrl, { method: request.method, headers, body: request.body });
  const resHeaders = new Headers(response.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");
  return new Response(response.body, { status: response.status, headers: resHeaders });
}

// ============================================================================
// Router
// ============================================================================

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/share" && request.method === "POST") {
      return handleShareCreate(request.clone(), env);
    }
    if (path.startsWith("/share/") && request.method === "GET") {
      return handleShareRetrieve(path.replace("/share/", ""), env);
    }
    if (path === "/ai") {
      return proxy(request, request.headers.get("X-Target-URL") || "");
    }
    if (path === "/metadata/full" && request.method === "POST") {
      return handleFullMetadata(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
