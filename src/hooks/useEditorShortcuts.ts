import { useEffect, useRef } from "react";
import type { TimestampedLine } from "@/lib/timeUtils";

interface EditorShortcutCallbacks {
  playPause: () => void;
  seekRelative: (deltaMs: number) => void;
  navigateToLine: (key: string) => void;
  openRowForEdit: (key: string) => void;
  closeRow: () => void;
  reSync: () => void;
}

const NAV_KEYS = new Set([
  " ",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

export function useEditorShortcuts(
  callbacks: EditorShortcutCallbacks,
  isRowOpen: boolean,
  audioActiveLineKey: string | null,
  sortedLines: TimestampedLine[],
  enabled: boolean,
): void {
  const stateRef = useRef({
    callbacks,
    isRowOpen,
    audioActiveLineKey,
    sortedLines,
  });
  stateRef.current = { callbacks, isRowOpen, audioActiveLineKey, sortedLines };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        callbacks,
        isRowOpen,
        audioActiveLineKey,
        sortedLines,
      } = stateRef.current;

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const isEditing = isRowOpen;
      const hasAudio = audioActiveLineKey !== null;

      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        e.stopPropagation();
        callbacks.closeRow();
        return;
      }

      if (isInput) return;

      if (e.key === "Enter" && !isEditing && hasAudio) {
        e.preventDefault();
        callbacks.openRowForEdit(audioActiveLineKey);
        return;
      }

      if (isEditing) return;

      if (NAV_KEYS.has(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case " ": {
          callbacks.playPause();
          break;
        }
        case "ArrowLeft": {
          callbacks.seekRelative(-2000);
          break;
        }
        case "ArrowRight": {
          callbacks.seekRelative(2000);
          break;
        }
        case "ArrowUp":
        case "ArrowDown": {
          if (sortedLines.length === 0) break;

          const currentIndex = audioActiveLineKey !== null
            ? sortedLines.findIndex((l) => l.key === audioActiveLineKey)
            : -1;

          if (currentIndex === -1) {
            // Nothing active: both arrows select the first line
            callbacks.navigateToLine(sortedLines[0].key);
            break;
          }

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
  }, [enabled]);
}
