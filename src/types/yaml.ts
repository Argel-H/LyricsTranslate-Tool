export interface ProjectYaml {
  version: number;
  project: ProjectYamlMeta;
  metadata: ProjectYamlMetadata;
  lyrics: ProjectYamlLyricLine[];
}

export interface ProjectYamlMeta {
  title: string;
  track_name: string;
  artists: string[];
  album_name?: string;
  cover_url?: string;
  isrcs?: string;
  origin_language?: string;
  translation_language?: string;
  song_link?: string;
  audio_url?: string;
  sync_offset_ms?: number;
  artist_links?: Array<{ name: string; url: string }>;
  social_links?: Array<{ platform: string; url: string; artist_name?: string }>;
  streaming_sites?: Record<string, string | null>;
}

export interface ProjectYamlMetadata {
  created_at: number;
  updated_at: number;
  exported_at: number;
}

export interface ProjectYamlLyricLine {
  time_start?: number;
  time_end?: number;
  original: string;
  translated: string;
  locked?: boolean;
}
