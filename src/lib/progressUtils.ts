import type { LyricLine } from "@/types/project";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/constants";

export interface ProgressResult {
  progress: number;
  status: ProjectStatus;
}

export function calculateLyricsProgress(lyrics: Record<string, LyricLine>): ProgressResult {
  const translatableLines = Object.values(lyrics).filter(
    (line) => line.lyric.trim().length > 0,
  );
  if (translatableLines.length === 0) return { progress: 0, status: PROJECT_STATUS.IN_PROGRESS };

  const translatedLines = translatableLines.filter(
    (line) => line.translation.trim().length > 0,
  ).length;
  const progress = Math.round((translatedLines / translatableLines.length) * 100);
  const status = progress === 100 ? PROJECT_STATUS.IN_REVIEW : PROJECT_STATUS.IN_PROGRESS;

  return { progress, status };
}
