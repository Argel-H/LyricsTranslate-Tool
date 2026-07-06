const isDev = import.meta.env.DEV;

const WORKER_URL = "https://subs-tool.fernandohu93.workers.dev";

export const API = {
  lrclib: "https://lrclib.net",
  deezer: isDev ? "/api-deezer" : `${WORKER_URL}/deezer`,
  musicbrainz: "https://musicbrainz.org",
  odesli: isDev ? "/api-odesli" : `${WORKER_URL}/odesli`,
  translate: isDev ? "/api-translate" : "https://api.simplytranslate.ai",
} as const;
