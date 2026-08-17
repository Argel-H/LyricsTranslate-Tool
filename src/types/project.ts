import type { ProjectStatus } from "@/lib/config/constants";

export interface LyricLine {
  time_start: number;
  time_end: number;
  lyric: string;
  translation: string;
  locked?: boolean; // if true, auto-translate skips this line
  comment?: string; // optional raw markdown comment attached to this line
}

export interface Project {
  id: number;
  /** Deprecated: derived on-the-fly as `${artistName[0]} - ${trackName}`. Not indexed/stored anymore. */
  title?: string;
  artistName: string[];
  trackName: string;
  lyrics: Record<string, LyricLine>;
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
