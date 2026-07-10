import { create } from "zustand";
import type { LyricLine } from "@/types/project";

/** Maximum number of undo steps retained in history */
export const MAX_UNDO_STEPS = 10;

interface LyricsSnapshot {
  lyrics: Record<string, LyricLine>;
}

interface HistoryState {
  undoStack: LyricsSnapshot[];
  redoStack: LyricsSnapshot[];
  projectId: number | null;

  pushSnapshot: (lyrics: Record<string, LyricLine>, projectId: number) => void;
  undo: (currentLyrics: Record<string, LyricLine>) => LyricsSnapshot | null;
  redo: (currentLyrics: Record<string, LyricLine>) => LyricsSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  projectId: null,

  pushSnapshot: (lyrics, projectId) => {
    const state = get();

    // Auto-clear if project changed
    if (state.projectId !== null && state.projectId !== projectId) {
      const snapshot: LyricsSnapshot = {
        lyrics: structuredClone(lyrics) as Record<string, LyricLine>,
      };
      set({ undoStack: [snapshot], redoStack: [], projectId });
      return;
    }

    // Deduplicate: skip if identical to last snapshot
    const last = state.undoStack[state.undoStack.length - 1];
    if (last) {
      const lastStr = JSON.stringify(last.lyrics);
      const currStr = JSON.stringify(lyrics);
      if (lastStr === currStr) return;
    }

    const snapshot: LyricsSnapshot = {
      lyrics: structuredClone(lyrics) as Record<string, LyricLine>,
    };

    const newUndo = [...state.undoStack, snapshot];
    // Enforce max steps limit
    while (newUndo.length > MAX_UNDO_STEPS) newUndo.shift();

    set({
      undoStack: newUndo,
      redoStack: [],
      projectId,
    });
  },

  undo: (currentLyrics) => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const snapshot = state.undoStack[state.undoStack.length - 1];

    const currentSnapshot: LyricsSnapshot = {
      lyrics: structuredClone(currentLyrics) as Record<string, LyricLine>,
    };

    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, currentSnapshot],
    });

    return snapshot;
  },

  redo: (currentLyrics) => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const snapshot = state.redoStack[state.redoStack.length - 1];

    const currentSnapshot: LyricsSnapshot = {
      lyrics: structuredClone(currentLyrics) as Record<string, LyricLine>,
    };

    set({
      undoStack: [...state.undoStack, currentSnapshot],
      redoStack: state.redoStack.slice(0, -1),
    });

    return snapshot;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clear: () => set({ undoStack: [], redoStack: [], projectId: null }),
}));
