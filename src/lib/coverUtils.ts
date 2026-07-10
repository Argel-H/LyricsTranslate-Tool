// Regex to match Deezer CDN cover URLs and capture the image hash.
// Pattern: https://cdn-images.dzcdn.net/images/cover/{hash}/...
const DEEZER_CDN_RE = /^https:\/\/cdn-images\.dzcdn\.net\/images\/cover\/([a-f0-9]+)\//;

/** HEAD-request timeout in milliseconds — should be near-instant. */
const HEAD_TIMEOUT_MS = 5_000;

/**
 * Returns true if the URL is a Deezer CDN cover image URL.
 */
export function isDeezerCoverUrl(url: string): boolean {
  return DEEZER_CDN_RE.test(url);
}

/**
 * Optimizes a Deezer CDN cover URL by trying 500x500 .webp first
 * (verified via a short HEAD request), falling back to 500x500 .jpg.
 *
 * Non-Deezer URLs are returned unchanged.
 */
export async function optimizeCoverUrl(url: string): Promise<string> {
  if (!isDeezerCoverUrl(url)) return url;

  const match = url.match(DEEZER_CDN_RE);
  if (!match) return url;

  const hash = match[1];
  const webpUrl = `https://cdn-images.dzcdn.net/images/cover/${hash}/500x500-000000-80-0-0.webp`;
  const jpgUrl  = `https://cdn-images.dzcdn.net/images/cover/${hash}/500x500-000000-80-0-0.jpg`;

  // Try webp first with a short HEAD request
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
    const response = await fetch(webpUrl, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) return webpUrl;
  } catch {
    // HEAD failed (timeout, 404, CORS, network) — fall through to jpg
  }

  return jpgUrl;
}
