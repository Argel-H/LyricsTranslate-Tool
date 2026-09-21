import { create } from "zustand";

interface PlaybackEntry {
  projectId: number;
  src: string;
  timeMs: number;
}

interface PlaybackState {
  entries: Record<number, PlaybackEntry>;
  save: (projectId: number, src: string, timeMs: number) => void;
  /** Returns the ms to resume, or null; consumes the entry on a successful restore. */
  restore: (projectId: number, src: string, durationMs: number) => number | null;
}

/**
 * Keyed by project id with an audio `src` guard, so duplicate projects sharing
 * an audio URL never resume each other's position. In-memory only.
 */
export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  entries: {},

  save: (projectId, src, timeMs) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [projectId]: { projectId, src, timeMs },
      },
    })),

  restore: (projectId, src, durationMs) => {
    const entry = get().entries[projectId];

    if (
      !entry ||
      entry.projectId !== projectId ||
      entry.src !== src ||
      entry.timeMs <= 0 ||
      entry.timeMs >= durationMs
    ) {
      return null;
    }

    set((state) => {
      const next = { ...state.entries };
      delete next[projectId];
      return { entries: next };
    });

    return entry.timeMs;
  },
}));
