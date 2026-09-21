import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useI18n } from "@/hooks/useI18n";
import {
  buildAutoTranslatePrompt,
  callGoogleGemini,
  callDeepSeek,
} from "@/services/simplyTranslate";
import type { AutoTranslateInput } from "@/services/simplyTranslate";
import { processLyricsMap } from "@/lib/lyricsParser";

export interface UseAutoTranslateResult {
  translating: boolean;
  translateError: string | null;
  clearError: () => void;
  run: () => Promise<void>;
}

export function useAutoTranslate(options: {
  onSuccess: () => void;
}): UseAutoTranslateResult {
  const { t } = useI18n();
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateAllLines = useProjectStore((s) => s.updateAllLines);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const overwriteTranslations = useSettingsStore(
    (s) => s.overwriteTranslations,
  );
  const aiApiKey = aiProvider ? apiKeys[aiProvider] : undefined;

  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const clearError = useCallback(() => setTranslateError(null), []);

  const { onSuccess } = options;

  const run = useCallback(async () => {
    if (!currentProject) return;
    const lyrics = currentProject.lyrics;
    const entries = Object.entries(lyrics);
    if (entries.length === 0) return;

    const sorted = entries
      .slice()
      .sort(([, a], [, b]) => a.time_start - b.time_start);

    const contextLines: AutoTranslateInput["contextLines"] = [];
    const targetLines: AutoTranslateInput["targetLines"] = [];
    const targetKeys: string[] = [];

    for (const [key, line] of sorted) {
      if (line.locked) {
        contextLines.push({
          timestamp: line.time_start,
          original: line.lyric,
          translated: line.translation || undefined,
          locked: true,
        });
      } else if (!overwriteTranslations && line.translation?.trim()) {
        // Reuse existing translations as context so the model stays consistent.
        contextLines.push({
          timestamp: line.time_start,
          original: line.lyric,
          translated: line.translation,
          locked: false,
        });
      } else {
        targetLines.push({
          timestamp: line.time_start,
          original: line.lyric,
        });
        targetKeys.push(key);
      }
    }

    if (targetLines.length === 0) {
      return;
    }

    const targetLanguage = currentProject.translationLanguage || "Spanish";
    const artistName = currentProject.artistName.join(", ");

    setTranslating(true);
    setTranslateError(null);

    try {
      const promptInput: AutoTranslateInput = {
        songTitle: currentProject.trackName,
        artistName,
        targetLanguage,
        contextLines,
        targetLines,
      };

      const prompt = buildAutoTranslatePrompt(promptInput, aiProvider!);

      let result: string | null = null;
      if (aiProvider === "google") {
        result = await callGoogleGemini(prompt, aiApiKey!);
      } else if (aiProvider === "deepseek") {
        result = await callDeepSeek(prompt, aiApiKey!);
      }

      if (!result) {
        setTranslateError(t("editor.translateError"));
        return;
      }

      const parsedMap = processLyricsMap(result);
      if (!parsedMap) {
        setTranslateError(t("editor.translateError"));
        return;
      }

      // Match by index: the model returns translations in the order sent. Index
      // matching is required for non-synced lyrics, where every time_start is 0.
      const updatedLyrics = { ...lyrics };
      const parsedEntries = Array.from(parsedMap.values());

      for (let i = 0; i < targetKeys.length && i < parsedEntries.length; i++) {
        const translation = parsedEntries[i]?.lyric?.trim();
        if (translation) {
          const key = targetKeys[i]!;
          updatedLyrics[key] = { ...lyrics[key]!, translation };
        }
      }

      await updateAllLines(updatedLyrics);
      useHistoryStore
        .getState()
        .pushSnapshot(
          { lyrics: updatedLyrics, notes: currentProject.notes ?? [] },
          currentProject.id,
        );
      onSuccess();
    } catch {
      // Surface a user-facing error without rethrowing.
      setTranslateError(t("editor.translateError"));
    } finally {
      setTranslating(false);
    }
  }, [
    currentProject,
    overwriteTranslations,
    aiProvider,
    aiApiKey,
    updateAllLines,
    t,
    onSuccess,
  ]);

  return { translating, translateError, clearError, run };
}
