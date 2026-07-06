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

    return json({ error: "Not found" }, 404);
  },
};

async function handleMetadata(isrc) {
  const deezerUrl = `https://api.deezer.com/2.0/track/isrc:${isrc}`;

  let deezerData = null;
  let odesliData = null;

  try {
    const deezerRes = await fetch(deezerUrl);
    if (deezerRes.ok) {
      deezerData = await deezerRes.json();
      const link = deezerData?.link;
      if (link) {
        const odesliRes = await fetch(
          `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(link)}`
        );
        if (odesliRes.ok) {
          odesliData = await odesliRes.json();
        }
      }
    }
  } catch {
    // fail silently, return partial data
  }

  return json({ deezer: deezerData, odesli: odesliData });
}

async function proxy(request, targetUrl) {
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
  });

  const corsHeaders = new Headers(response.headers);
  corsHeaders.set("Access-Control-Allow-Origin", "*");
  corsHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  corsHeaders.set("Access-Control-Allow-Headers", "*");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
