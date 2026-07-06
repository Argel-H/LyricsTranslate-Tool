export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const isrc = url.searchParams.get("isrc");

    if (path === "/metadata" && isrc) {
      return handleMetadata(isrc);
    }

    if (path.startsWith("/deezer")) {
      return proxy(request, `https://api.deezer.com${path.replace("/deezer", "")}${url.search}`);
    }
    if (path.startsWith("/odesli")) {
      return proxy(request, `https://api.song.link${path.replace("/odesli", "")}${url.search}`);
    }

    return new Response("Not found", { status: 404 });
  },
};

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
      const odesliRes = await fetch(
        `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(link)}`
      );
      if (odesliRes.ok) odesliData = await odesliRes.json();
    } catch {}
  }

  return json({ deezer: deezerData, odesli: odesliData });
}

async function proxy(request, targetUrl) {
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
  });
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(response.body, { status: response.status, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
