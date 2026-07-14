import type { LyricLine, Project } from "@/types/project";

export function makeLyricLine(overrides?: Partial<LyricLine>): LyricLine {
  return {
    time_start: 0,
    time_end: 5000,
    lyric: "Original lyric",
    translation: "Translated lyric",
    ...overrides,
  };
}

export function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: 1,
    title: "Test Artist - Test Track",
    artistName: ["Test Artist"],
    trackName: "Test Track",
    lyrics: {},
    status: "in-progress" as const,
    progress: 50,
    createdAt: 1720000000000,
    updatedAt: 1720500000000,
    ...overrides,
  };
}
