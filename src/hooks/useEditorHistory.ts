import { useCallback } from "react";
import type { MutableRefObject } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { useProjectStore } from "@/stores/projectStore";
import type { LyricLine } from "@/types/project";

export interface UseEditorHistoryArgs {
  activeLineKey: string | null;
  /** Snapshot of the lyrics as they were when the active row was opened. */
  activeLyricsRef: MutableRefObject<Record<string, LyricLine> | null>;
}

export interface UseEditorHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  snapshot: () => void;
  pushLeaving: (newRowKey: string | null) => void;
  undo: () => void;
  redo: () => void;
}

export function useEditorHistory({
  activeLineKey,
  activeLyricsRef,
}: UseEditorHistoryArgs): UseEditorHistoryResult {
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);

  const snapshot = useCallback(() => {
    const project = useProjectStore.getState().currentProject;
    if (project) {
      useHistoryStore
        .getState()
        .pushSnapshot(
          { lyrics: project.lyrics, notes: project.notes ?? [] },
          project.id,
        );
    }
  }, []);

  // Handles same-row re-clicks (bug fix #1) and different-row transitions.
  const pushLeaving = useCallback(
    (newRowKey: string | null) => {
      const leaving = activeLyricsRef.current;
      if (!leaving || activeLineKey === null) return;
      const project = useProjectStore.getState().currentProject;
      if (!project) return;

      if (activeLineKey === newRowKey) {
        // Only push if state actually changed (bug fix #1).
        if (JSON.stringify(project.lyrics) !== JSON.stringify(leaving)) {
          useHistoryStore
            .getState()
            .pushSnapshot(
              { lyrics: leaving, notes: project.notes ?? [] },
              project.id,
            );
        }
      } else {
        useHistoryStore
          .getState()
          .pushSnapshot(
            { lyrics: leaving, notes: project.notes ?? [] },
            project.id,
          );
      }
    },
    // activeLyricsRef is a stable ref object; only the key can meaningfully change.
    [activeLineKey, activeLyricsRef],
  );

  const undo = useCallback(() => {
    const project = useProjectStore.getState().currentProject;
    if (!project) return;
    const snapshotToRestore = useHistoryStore.getState().undo({
      lyrics: project.lyrics,
      notes: project.notes ?? [],
    });
    if (snapshotToRestore) {
      // Apply restored state without snapshotting it.
      void useProjectStore.getState().updateAllLines(snapshotToRestore.lyrics);
      void useProjectStore.getState().setNotes(snapshotToRestore.notes);
    }
  }, []);

  const redo = useCallback(() => {
    const project = useProjectStore.getState().currentProject;
    if (!project) return;
    const snapshotToRestore = useHistoryStore.getState().redo({
      lyrics: project.lyrics,
      notes: project.notes ?? [],
    });
    if (snapshotToRestore) {
      // Apply restored state without snapshotting it.
      void useProjectStore.getState().updateAllLines(snapshotToRestore.lyrics);
      void useProjectStore.getState().setNotes(snapshotToRestore.notes);
    }
  }, []);

  return { canUndo, canRedo, snapshot, pushLeaving, undo, redo };
}
