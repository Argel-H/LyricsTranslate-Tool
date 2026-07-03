import { useState, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { batchTranslate } from "@/services/simplyTranslate";
import { interfaceLanguageToEditorTarget } from "@/lib/languageUtils";
import type { LyricLine } from "@/types/project";

function isTranslatable(line: LyricLine): boolean {
  if (!line.lyric.trim()) return false;
  if (line.lyric.includes("[") && line.lyric.includes("]")) return false;
  return true;
}

export function useTranslationManager() {
  const { currentProject, updateAllLines } = useProjectStore();
  const interfaceLanguage = useSettingsStore((s) => s.language);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [totalToTranslate, setTotalToTranslate] = useState(0);

  const targetLanguage = interfaceLanguageToEditorTarget(interfaceLanguage);

  const startAutoTranslate = useCallback(async () => {
    if (!currentProject) return;
    const entries = Object.entries(currentProject.lyrics);
    const translatableLines = entries
      .filter(([, line]) => isTranslatable(line))
      .map(([key, line]) => ({ lyric: line.lyric, key }));

    setIsTranslating(true);
    setTotalToTranslate(translatableLines.length);
    setTranslatedCount(0);

    try {
      const translations = await batchTranslate(
        translatableLines,
        "auto",
        targetLanguage,
        (current) => setTranslatedCount(current),
      );

      const updatedLyrics = { ...currentProject.lyrics };
      for (const [key, translation] of Object.entries(translations)) {
        if (updatedLyrics[key]) {
          updatedLyrics[key] = { ...updatedLyrics[key], translation };
        }
      }
      await updateAllLines(updatedLyrics);
    } catch {
      // Translation service unavailable — silently fail
    } finally {
      setIsTranslating(false);
    }
  }, [currentProject, targetLanguage, updateAllLines]);

  return {
    isTranslating,
    translatedCount,
    totalToTranslate,
    startAutoTranslate,
  };
}
