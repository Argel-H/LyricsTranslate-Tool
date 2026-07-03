import { useState, useCallback, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { parseTimestampToMilliseconds, formatMillisecondsToTimestamp } from "@/lib/timeUtils";
import { generateNextLyricLineKey } from "@/lib/lyricKeyUtils";
import { TIME_STEP_MS, DEFAULT_LINE_DURATION_MS } from "@/lib/constants";
import { useClickOutside } from "@/hooks/useClickOutside";

export type TimeField = "time_start" | "time_end";
export type AdjustmentDirection = 1 | -1;

export function useLyricEditor(projectId: string | undefined) {
  const { currentProject, isLoading, loadProject, updateLine, updateAllLines } =
    useProjectStore();

  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) loadProject(Number(projectId));
  }, [projectId, loadProject]);

  useClickOutside(tableRef, () => setActiveLineKey(null), activeLineKey !== null);

  const lyricsEntries = currentProject ? Object.entries(currentProject.lyrics) : [];

  const addLine = useCallback(async () => {
    if (!currentProject) return;
    const updatedLyrics = { ...currentProject.lyrics };
    const keys = Object.keys(updatedLyrics);
    const newKey = generateNextLyricLineKey(keys);

    const lastEndTime = keys.length > 0
      ? parseTimestampToMilliseconds(updatedLyrics[keys[keys.length - 1]!]!.time_end)
      : 0;

    updatedLyrics[newKey] = {
      time_start: formatMillisecondsToTimestamp(lastEndTime),
      time_end: formatMillisecondsToTimestamp(lastEndTime + DEFAULT_LINE_DURATION_MS),
      lyric: "",
      translation: "",
      comment: "",
    };

    await updateAllLines(updatedLyrics);
    setActiveLineKey(newKey);
  }, [currentProject, updateAllLines]);

  const deleteLine = useCallback(
    async (key: string) => {
      if (!currentProject) return;
      const updatedLyrics = { ...currentProject.lyrics };
      delete updatedLyrics[key];
      if (activeLineKey === key) setActiveLineKey(null);
      await updateAllLines(updatedLyrics);
    },
    [currentProject, activeLineKey, updateAllLines],
  );

  const adjustTimestamp = useCallback(
    (key: string, field: TimeField, direction: AdjustmentDirection) => {
      if (!currentProject) return;
      const { lyrics } = currentProject;
      const orderedKeys = Object.keys(lyrics);
      const currentIndex = orderedKeys.indexOf(key);
      if (currentIndex === -1) return;

      const currentTimestamp = parseTimestampToMilliseconds(lyrics[key]![field]);
      const adjustedTimestamp = currentTimestamp + direction * TIME_STEP_MS;

      if (field === "time_start") {
        const minimum = currentIndex > 0
          ? parseTimestampToMilliseconds(lyrics[orderedKeys[currentIndex - 1]!]!.time_end)
          : 0;
        const maximum = parseTimestampToMilliseconds(lyrics[key]!.time_end) - TIME_STEP_MS;
        if (adjustedTimestamp < minimum || adjustedTimestamp > maximum) return;
      } else {
        const minimum = parseTimestampToMilliseconds(lyrics[key]!.time_start) + TIME_STEP_MS;
        const maximum = currentIndex < orderedKeys.length - 1
          ? parseTimestampToMilliseconds(lyrics[orderedKeys[currentIndex + 1]!]!.time_start)
          : Infinity;
        if (adjustedTimestamp < minimum || adjustedTimestamp > maximum) return;
      }

      updateLine(key, field, formatMillisecondsToTimestamp(adjustedTimestamp));
    },
    [currentProject, updateLine],
  );

  return {
    currentProject,
    isLoading,
    activeLineKey,
    setActiveLineKey,
    lyricsEntries,
    tableRef,
    addLine,
    deleteLine,
    adjustTimestamp,
    updateLine,
  };
}
