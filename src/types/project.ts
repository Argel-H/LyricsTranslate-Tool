import type { ProjectStatus } from "@/lib/constants";

export interface LyricLine {
  time_start: number;
  time_end: number;
  lyric: string;
  translation: string;
  locked?: boolean; // if true, auto-translate skips this line
}

export interface Project {
  id: number;
  title: string;
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
  songLinkUrl?: string;
  artistLinks?: Array<{ name: string; url: string }>;
  recommendedSocialLinks?: Array<{ platform: string; url: string; artistName?: string }>;
  audioUrl?: string;
  syncOffsetMs?: number;
}
