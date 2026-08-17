import { create } from "zustand";
import type { LyricLine, Note } from "@/types/project";

/** Maximum number of undo steps retained in history */
export const MAX_UNDO_STEPS = 10;

/**
 * A point-in-time copy of the editor state. Includes both the lyrics map and
 * the free-floating notes so undo/redo restores the entire project state.
 *
 * Key order ({ lyrics, notes }) is significant: pushSnapshot dedup compares
 * whole snapshots via JSON.stringify, so every construction site must build
 * the object with the same key order.
 */
interface ProjectSnapshot {
  lyrics: Record<string, LyricLine>;
  notes: Note[];
}

interface HistoryState {
  undoStack: ProjectSnapshot[];
  redoStack: ProjectSnapshot[];
  projectId: number | null;

  pushSnapshot: (snapshot: ProjectSnapshot, projectId: number) => void;
  undo: (current: ProjectSnapshot) => ProjectSnapshot | null;
  redo: (current: ProjectSnapshot) => ProjectSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  projectId: null,

  pushSnapshot: (snapshot, projectId) => {
    const state = get();

    // Switching projects resets history so snapshots never leak across projects.
    if (state.projectId !== null && state.projectId !== projectId) {
      set({
        undoStack: [structuredClone(snapshot)],
        redoStack: [],
        projectId,
      });
      return;
    }

    // Dedup: skip pushes that are byte-identical to the most recent snapshot.
    const last = state.undoStack[state.undoStack.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return;

    const newUndo = [...state.undoStack, structuredClone(snapshot)];
    while (newUndo.length > MAX_UNDO_STEPS) newUndo.shift();

    set({
      undoStack: newUndo,
      redoStack: [],
      projectId,
    });
  },

  undo: (current) => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const snapshot = state.undoStack[state.undoStack.length - 1];

    const currentSnapshot: ProjectSnapshot = {
      lyrics: structuredClone(current.lyrics),
      notes: structuredClone(current.notes),
    };

    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, currentSnapshot],
    });

    return snapshot;
  },

  redo: (current) => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const snapshot = state.redoStack[state.redoStack.length - 1];

    const currentSnapshot: ProjectSnapshot = {
      lyrics: structuredClone(current.lyrics),
      notes: structuredClone(current.notes),
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
