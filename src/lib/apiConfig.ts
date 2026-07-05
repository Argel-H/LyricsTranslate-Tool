const isDev = import.meta.env.DEV;

export const API = {
  lrclib: isDev ? "/api-lrclib" : "https://lrclib.net",
  deezer: isDev ? "/api-deezer" : "https://api.deezer.com",
  musicbrainz: isDev ? "/api-musicbrainz" : "https://musicbrainz.org",
  odesli: isDev ? "/api-odesli" : "https://api.song.link",
  translate: isDev ? "/api-translate" : "https://api.simplytranslate.ai",
} as const;
