import type { ProjectStatus } from "@/lib/config/constants";

export interface LyricLine {
  time_start: number;
  time_end: number;
  lyric: string;
  translation: string;
  locked?: boolean; // if true, auto-translate skips this line
  comment?: string; // optional raw markdown comment attached to this line
}

/** A free-floating markdown note attached to a project. */
export interface Note {
  /** Runtime-only id; NOT serialized to YAML/share. */
  id: number;
  /** Raw markdown text. */
  text: string;
}

export interface Project {
  id: number;
  artistName: string[];
  trackName: string;
  lyrics: Record<string, LyricLine>;
  notes?: Note[];
  status: ProjectStatus;
  progress: number;
  archived?: boolean;
  coverUrl?: string;
  isrcs?: string;
  streamingSites?: Record<string, string | null>;
  originLanguage?: string;
  translationLanguage?: string;
  albumName?: string;
  wallpaperArtistName?: string;
  wallpaperSource?: string;
  wallpaperUrl?: string;
  songLinkUrl?: string;
  artistLinks?: Array<{ name: string; url: string }>;
  recommendedSocialLinks?: Array<{ platform: string; url: string; artistName?: string }>;
  audioUrl?: string;
  syncOffsetMs?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectCreateInput {
  artistName: string[];
  trackName: string;
  lyrics: Record<string, LyricLine>;
  /** Ordered raw markdown strings used when importing a project. */
  notes?: string[];
  coverUrl?: string;
  isrcs?: string;
  streamingSites?: Record<string, string | null>;
  originLanguage?: string;
  translationLanguage?: string;
  albumName?: string;
  wallpaperArtistName?: string;
  wallpaperSource?: string;
  wallpaperUrl?: string;
  songLinkUrl?: string;
  artistLinks?: Array<{ name: string; url: string }>;
  recommendedSocialLinks?: Array<{ platform: string; url: string; artistName?: string }>;
  audioUrl?: string;
  syncOffsetMs?: number;
}
