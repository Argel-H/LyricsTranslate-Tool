import { useEffect } from "react";
import type { TimestampedLine } from "@/lib/timeUtils";

interface EditorShortcutCallbacks {
  playPause: () => void;
  seekRelative: (deltaMs: number) => void;
  navigateToLine: (key: string) => void;
  openRowForEdit: (key: string) => void;
  closeRow: () => void;
  reSync: () => void;
}

export function useEditorShortcuts(
  callbacks: EditorShortcutCallbacks,
  isRowOpen: boolean,
  audioActiveLineKey: string | null,
  sortedLines: TimestampedLine[],
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const isEditing = isRowOpen;
      const hasAudio = audioActiveLineKey !== null;

      // ── Escape: close open row (works even when focus is in textarea) ──
      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        e.stopPropagation();
        callbacks.closeRow();
        return;
      }

      // ── Below here: ignore when focus is in an input ──
      if (isInput) return;

      // ── Enter: open highlighted row for editing ──
      if (e.key === "Enter" && !isEditing && hasAudio) {
        e.preventDefault();
        callbacks.openRowForEdit(audioActiveLineKey);
        return;
      }

      // ── Below here: only when no row is open ──
      if (isEditing) return;

      switch (e.key) {
        case " ": {
          e.preventDefault();
          callbacks.playPause();
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          callbacks.seekRelative(-2000);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          callbacks.seekRelative(2000);
          break;
        }
        case "ArrowUp":
        case "ArrowDown": {
          if (!hasAudio || sortedLines.length === 0) break;
          e.preventDefault();
          const currentIndex = sortedLines.findIndex(
            (l) => l.key === audioActiveLineKey,
          );
          if (currentIndex === -1) break;
          const nextIndex =
            e.key === "ArrowUp"
              ? Math.max(0, currentIndex - 1)
              : Math.min(sortedLines.length - 1, currentIndex + 1);
          if (nextIndex !== currentIndex) {
            callbacks.navigateToLine(sortedLines[nextIndex].key);
          }
          break;
        }
        case "r":
        case "R": {
          if (hasAudio) {
            e.preventDefault();
            callbacks.reSync();
          }
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, isRowOpen, audioActiveLineKey, sortedLines, callbacks]);
}
