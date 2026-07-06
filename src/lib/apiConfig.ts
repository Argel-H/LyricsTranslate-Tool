const isDev = import.meta.env.DEV;

const WORKER_URL = "https://subs-tool-endpoints.iamargelh.mov";

export const API = {
  lrclib: "https://lrclib.net",
  deezer: isDev ? "/api-deezer" : `${WORKER_URL}/deezer`,
  musicbrainz: "https://musicbrainz.org",
  odesli: isDev ? "/api-odesli" : `${WORKER_URL}/odesli`,
  translate: isDev ? "/api-translate" : "https://api.simplytranslate.ai",
  metadata: isDev ? undefined : `${WORKER_URL}/metadata`,
} as const;
