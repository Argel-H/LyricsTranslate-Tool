export const PROJECT_STATUS = {
  IN_PROGRESS: "in-progress",
  IN_REVIEW: "in-review",
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const LANGUAGES = {
  en: "en",
  es: "es",
  pt: "pt",
} as const;

export type LanguageCode = (typeof LANGUAGES)[keyof typeof LANGUAGES];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

export const DEBOUNCE_SEARCH_MS = 350;

export const TRANSLATE_RATE_LIMIT_MS = 700;

export const DEFAULT_LINE_DURATION_MS = 3000;

export const TIME_STEP_MS = 100;

export const BLUR_TIMEOUT_MS = 150;

export const LRC_LINE_KEY_PREFIX = "lrc_";

export const LRC_LINE_KEY_PADDING = 2;

export const DROPDOWN_MAX_HEIGHT_PX = 370;

export const PREFERENCES_SINGLETON_ID = "singleton" as const;

export const LANGUAGE_NAMES = [
  "English", "Spanish", "Portuguese", "French", "German",
  "Italian", "Japanese", "Korean", "Chinese", "Arabic",
  "Russian", "Hindi",
] as const;

export const PLATFORM_NAMES = [
  "Spotify", "Apple Music", "Deezer", "YouTube", "SoundCloud",
  "Tidal", "Amazon Music", "Instagram", "Twitter/X", "TikTok",
  "Facebook", "Website",
] as const;

export const RELATION_TYPE_MAP: Record<string, string> = {
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
};

export const EXPORT_FORMATS = ["lrc", "srt"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
