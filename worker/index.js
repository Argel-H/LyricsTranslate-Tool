// ============================================================================
// Shared Constants & Utilities
// ============================================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

const MAX_MBIDS_PER_REQUEST = 5;
const FETCH_DELAY_MS = 400;
const MB_CACHE_TTL_SECONDS = 86400;
const MB_CACHE_KEY_PREFIX = "https://mb-social/";
const MUSICBRAINZ_ARTIST_URL = "https://musicbrainz.org/ws/2/artist";
const MUSICBRAINZ_USER_AGENT = "LyricsTranslate-Tool/0.0.5 (lyricstranslate@tool.com)";

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

const FULL_METADATA_CACHE_KEY_PREFIX = "https://full-metadata/";
const MUSICBRAINZ_RECORDING_URL = "https://musicbrainz.org/ws/2/recording/";
const DEEZER_TRACK_URL = "https://api.deezer.com/2.0/track/isrc:";
const DEEZER_SEARCH_URL = "https://api.deezer.com/search/track";
const ODESLI_LINKS_URL = "https://api.song.link/v1-alpha.1/links";

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

    const artistName = typeof body?.artistName === "string" ? body.artistName.trim() : "";
    const trackName = typeof body?.trackName === "string" ? body.trackName.trim() : "";
    if (!artistName || !trackName) {
      return json({ error: "Missing artistName or trackName" }, 400);
    }
    const albumName =
      typeof body?.albumName === "string" && body.albumName.trim() !== ""
        ? body.albumName.trim()
        : undefined;

    const cacheKey =
      FULL_METADATA_CACHE_KEY_PREFIX +
      encodeURIComponent(artistName) +
      ":" +
      encodeURIComponent(trackName);
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      return cached;
    }

    const { isrc, artistMbids, artistNames, trackTitle } = await fetchMusicBrainzRecording(
      artistName,
      trackName,
    );

    // NOTE: MusicBrainz politely asks for ~1 request per second. This endpoint
    // issues 1 recording search + up to 5 artist fetches (~3s worst case).
    // Acceptable for single-user usage; for production scale, move MB fetches
    // behind a proper rate limiter/queue before adding this endpoint to
    // high-traffic paths.
    const [socialByMbid, isrcResult] = await Promise.all([
      artistMbids.length > 0 ? resolveSocialLinksBatch(artistMbids) : Promise.resolve({}),
      isrc
        ? (async () => {
            const deezer = await fetchDeezerByISRC(isrc);
            if (!deezer?.link) return { deezer: null, odesli: null };
            const odesli = await fetchOdesliUrls(deezer.link);
            return { deezer, odesli };
          })()
        : Promise.resolve({ deezer: null, odesli: null }),
    ]);

    // ISRC path produced no cover — fall back to search by name.
    let coverUrl = isrcResult.deezer?.cover ?? "";
    let nameDeezer = null;
    let nameOdesli = null;
    if (!coverUrl) {
      const searchArtist = artistNames[0] ?? artistName;
      const searchTrack = trackTitle ?? trackName;
      nameDeezer = await fetchDeezerByName(searchArtist, searchTrack);
      if (nameDeezer?.link) {
        nameOdesli = await fetchOdesliUrls(nameDeezer.link);
      }
      if (nameDeezer) coverUrl = nameDeezer.cover ?? "";
    }

    if (coverUrl) {
      coverUrl = await optimizeCoverUrl(coverUrl);
    }

    const result = assembleFullMetadata({
      inputArtistName: artistName,
      inputTrackName: trackName,
      inputAlbumName: albumName,
      isrc,
      artistMbids,
      artistNames,
      trackTitle,
      socialByMbid,
      isrcDeezer: isrcResult.deezer,
      isrcOdesli: isrcResult.odesli,
      nameDeezer,
      nameOdesli,
      coverUrl,
    });

    // Store the assembled response for 24 hours. A separate Response is used
    // (instead of sharing `json(result)`'s body) so the cached copy never
    // shares a consumed stream with the one we return.
    const cacheResponse = new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `public, max-age=${MB_CACHE_TTL_SECONDS}`,
      },
    });
    await caches.default.put(cacheKey, cacheResponse);

    return json(result);
  } catch (err) {
    console.error("handleFullMetadata: unexpected failure:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

async function fetchMusicBrainzRecording(artistName, trackName) {
  try {
    const url = new URL(MUSICBRAINZ_RECORDING_URL);
    url.searchParams.set("query", `artist:'${artistName}' AND recording:'${trackName}'`);
    url.searchParams.set("fmt", "json");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: {
        "User-Agent": MUSICBRAINZ_USER_AGENT,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`MusicBrainz recording search responded with ${response.status}`);
    }
    const data = await response.json();
    const recording = data?.recordings?.[0];

    const artistMbids = [];
    const artistNames = [];
    recording?.["artist-credit"]?.forEach((ac) => {
      if (ac.artist?.id) {
        artistMbids.push(ac.artist.id);
        artistNames.push(ac.name);
      }
    });

    return {
      isrc: recording?.isrcs?.[0] ?? null,
      artistMbids,
      artistNames,
      trackTitle: recording?.title ?? null,
    };
  } catch (err) {
    console.error("fetchMusicBrainzRecording failed:", err);
    return { isrc: null, artistMbids: [], artistNames: [], trackTitle: null };
  }
}

async function resolveSocialLinksBatch(mbids) {
  const limited = mbids.slice(0, MAX_MBIDS_PER_REQUEST);
  const results = {};
  let hasPendingFetch = false;

  for (const mbid of limited) {
    try {
      const cacheKey = MB_CACHE_KEY_PREFIX + mbid;
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const cachedData = await cached.json();
        results[mbid] = { links: Array.isArray(cachedData.links) ? cachedData.links : [] };
        continue;
      }

      // Pace non-cached MusicBrainz fetches ~400ms apart (politeness).
      if (hasPendingFetch) {
        await sleep(FETCH_DELAY_MS);
      }
      hasPendingFetch = true;

      const response = await fetch(
        `${MUSICBRAINZ_ARTIST_URL}/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`,
        {
          headers: {
            "User-Agent": MUSICBRAINZ_USER_AGENT,
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
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

  return results;
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

async function fetchDeezerByName(artistName, trackName) {
  try {
    const url = new URL(DEEZER_SEARCH_URL);
    url.searchParams.set("q", `artist:"${artistName}" track:"${trackName}"`);
    url.searchParams.set("limit", "1");
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const track = data?.data?.[0];
    if (!track) return null;
    const { artists, artistLinks } = extractDeezerArtists(track);
    return {
      link: track.link ?? null,
      cover: track.album?.cover_xl ?? "",
      albumName: track.album?.title ?? null,
      artists,
      artistLinks,
    };
  } catch (err) {
    console.error("fetchDeezerByName failed:", err);
    return null;
  }
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
    // HEAD failed (timeout, 404, network) — fall through to jpg.
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
  // cover, so `??` is safe — the ISRC result wins when both exist.
  const deezerTrack = isrcDeezer ?? nameDeezer;
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
// SECTION 4 — AI Proxy
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
