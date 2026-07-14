const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
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
