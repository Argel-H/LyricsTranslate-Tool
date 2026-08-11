const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// --- MusicBrainz artist social-links batching ---
const MAX_MBIDS_PER_REQUEST = 5;
const FETCH_DELAY_MS = 400; // delay between non-cached MusicBrainz fetches
const MB_CACHE_TTL_SECONDS = 86400; // 1 day
const MB_CACHE_KEY_PREFIX = "https://mb-social/";
const MUSICBRAINZ_ARTIST_URL = "https://musicbrainz.org/ws/2/artist";
const MUSICBRAINZ_USER_AGENT = "LyricsTranslate-Tool/0.0.5 (lyricstranslate@tool.com)";

// SocialMedia Dict
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

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const isrc = url.searchParams.get("isrc");

    if (path === "/share" && request.method === "POST") {
      return handleShareCreate(request.clone(), env);
    }

    if (path.startsWith("/share/") && request.method === "GET") {
      return handleShareRetrieve(path.replace("/share/", ""), env);
    }

    if (path === "/metadata" && isrc) {
      return handleMetadata(isrc);
    }

    if (path.startsWith("/deezer")) {
      return proxy(request, `https://api.deezer.com${path.replace("/deezer", "")}${url.search}`);
    }
    if (path.startsWith("/odesli")) {
      return proxy(request, `https://api.song.link${path.replace("/odesli", "")}${url.search}`);
    }
    if (path === "/ai") {
      return proxy(request, request.headers.get("X-Target-URL") || "");
    }

    if (path === "/musicbrainz/artists" && request.method === "POST") {
      return handleMusicBrainzArtists(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

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

async function handleMetadata(isrc) {
  const deezerUrl = `https://api.deezer.com/2.0/track/isrc:${isrc}`;
  let deezerData = null;
  let odesliData = null;

  try {
    const deezerRes = await fetch(deezerUrl);
    if (deezerRes.ok) deezerData = await deezerRes.json();
  } catch {}

  const link = deezerData?.link;
  if (link) {
    try {
      const odesliRes = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(link)}`);
      if (odesliRes.ok) odesliData = await odesliRes.json();
    } catch {}
  }

  return json({ deezer: deezerData, odesli: odesliData });
}

async function proxy(request, targetUrl) {
  if (!targetUrl) return new Response("Missing target URL", { status: 400 });
  const headers = new Headers(request.headers);
  headers.delete("X-Target-URL");
  const response = await fetch(targetUrl, { method: request.method, headers, body: request.body });
  const resHeaders = new Headers(response.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");
  return new Response(response.body, { status: response.status, headers: resHeaders });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mirrors platformFromUrl() in src/services/musicbrainz.ts exactly.
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

// Mirrors the relation-filtering loop in fetchArtistSocialLinks()
// (src/services/musicbrainz.ts) exactly: map the relation type first, fall
// back to URL-domain matching for generic types, deduplicate by platform.
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

async function fetchMusicBrainzArtistLinks(mbid) {
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
  return extractSocialLinks(data);
}

async function handleMusicBrainzArtists(request) {
  try {
    let mbids;
    try {
      const body = await request.json();
      mbids = body?.mbids;
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!Array.isArray(mbids) || mbids.length === 0) {
      return json({ error: "mbids must be a non-empty array" }, 400);
    }
    if (mbids.length > MAX_MBIDS_PER_REQUEST) {
      return json({ error: `mbids must contain at most ${MAX_MBIDS_PER_REQUEST} items` }, 400);
    }
    if (mbids.some((mbid) => typeof mbid !== "string" || mbid.trim() === "")) {
      return json({ error: "Each mbid must be a non-empty string" }, 400);
    }

    const artists = {};
    let hasPendingFetch = false;

    for (const mbid of mbids) {
      try {
        const cacheKey = MB_CACHE_KEY_PREFIX + mbid;
        const cached = await caches.default.match(cacheKey);
        if (cached) {
          const cachedData = await cached.json();
          artists[mbid] = { links: Array.isArray(cachedData.links) ? cachedData.links : [] };
          continue;
        }

        if (hasPendingFetch) {
          await sleep(FETCH_DELAY_MS);
        }
        hasPendingFetch = true;

        const links = await fetchMusicBrainzArtistLinks(mbid);
        artists[mbid] = { links };

        const cacheResponse = new Response(JSON.stringify({ links }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${MB_CACHE_TTL_SECONDS}`,
          },
        });
        await caches.default.put(cacheKey, cacheResponse);
      } catch (err) {
        console.error(`handleMusicBrainzArtists: failed for mbid ${mbid}:`, err);
        artists[mbid] = { links: [] };
      }
    }

    return json({ artists });
  } catch (err) {
    console.error("handleMusicBrainzArtists: unexpected failure:", err);
    return json({ error: "Internal server error" }, 500);
  }
}
