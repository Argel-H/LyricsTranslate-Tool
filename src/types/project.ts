import type { ProjectStatus } from "@/lib/constants";

export interface LyricLine {
  time_start: string;
  time_end: string;
  lyric: string;
  translation: string;
  comment: string;
  locked?: boolean; // NEW: if true, auto-translate skips this line
}

export interface Project {
  id: number;
  title: string;
  artistName: string[];
  trackName: string;
  lyrics: Record<string, LyricLine>;
  status: ProjectStatus;
  progress: number;
  coverUrl?: string;
  isrcs?: string;
  streamingSites?: Record<string, string | null>;
  originLanguage?: string;
  translationLanguage?: string;
  albumName?: string;
  songLinkUrl?: string;
  artistLinks?: Array<{ name: string; url: string }>;
  recommendedSocialLinks?: Array<{ platform: string; url: string; artistName?: string }>;
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
  songLinkUrl?: string;
  artistLinks?: Array<{ name: string; url: string }>;
  recommendedSocialLinks?: Array<{ platform: string; url: string; artistName?: string }>;
}
