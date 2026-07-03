import type { LyricLine } from "@/types/project";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/constants";

export interface ProgressResult {
  progress: number;
  status: ProjectStatus;
}

export function calculateLyricsProgress(lyrics: Record<string, LyricLine>): ProgressResult {
  const totalLines = Object.keys(lyrics).length;
  if (totalLines === 0) return { progress: 0, status: PROJECT_STATUS.IN_PROGRESS };

  const translatedLines = Object.values(lyrics).filter(
    (line) => line.translation.trim().length > 0,
  ).length;
  const progress = Math.round((translatedLines / totalLines) * 100);
  const status = progress === 100 ? PROJECT_STATUS.IN_REVIEW : PROJECT_STATUS.IN_PROGRESS;

  return { progress, status };
}
