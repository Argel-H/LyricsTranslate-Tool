import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MasterCard } from "@/features/shell/MasterCard";
import { TableRow } from "./TableRow";
import { AudioPlayerBar } from "./AudioPlayerBar";
import { SegmentedButton } from "./SegmentedButton";
import { FloatingActionButton } from "./FloatingActionButton";
import { useHistoryStore } from "@/stores/historyStore";
import { UndoRedoButton } from "./UndoRedoButton";
import { useProjectStore } from "@/stores/projectStore";
import {
  getSortedLyricLines,
  formatMillisecondsToTimestamp,
} from "@/lib/timeUtils";
import type { TimestampedLine } from "@/lib/timeUtils";
import { useModalStore } from "@/stores/modalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useI18n } from "@/hooks/useI18n";
import { useSmartBack } from "@/hooks/useSmartBack";
import { PROJECT_STATUS } from "@/lib/config/constants";
import {
  buildAutoTranslatePrompt,
  callGoogleGemini,
  callDeepSeek,
} from "@/services/simplyTranslate";
import type { AutoTranslateInput } from "@/services/simplyTranslate";
import { processLyricsMap } from "@/lib/lyricsParser";
import type { LyricLine } from "@/types/project";
import { findAllTranslations } from "@/lib/suggestionUtils";
import { AI_PROVIDERS } from "@/lib/config/aiConfig";
import { downloadProjectAsYaml, formatSrtTimestamp } from "@/lib/exportUtils";
import { ExportDialog } from "./ExportDialog";
import {
  Edit,
  Sparkles,
  Loader2,
  Plus,
  RefreshCw,
  Music,
  CheckCircle,
  Share2,
  Download,
} from "lucide-react";
import { createShortShareUrl } from "@/lib/share/shareProtocol";
import { getShareBaseUrl } from "@/types/share";
import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { Toast } from "@/components/shared/Toast";
import { AnimatePresence, motion } from "framer-motion";
import { MessageModal } from "@/components/shared/MessageModal";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { useClickOutside } from "@/hooks/useClickOutside";
import { usePageShell } from "@/hooks/usePageShell";
import { ShareDialog } from "./ShareDialog";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { useShellStore } from "@/stores/shellStore";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const smartBack = useSmartBack();
  const {
    currentProject,
    isLoading,
    loadProject,
    updateLine,
    updateAllLines,
    localAudioSrc,
  } = useProjectStore();
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const aiApiKey = aiProvider ? apiKeys[aiProvider] : undefined;
  const overwriteTranslations = useSettingsStore(
    (s) => s.overwriteTranslations,
  );
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const [focusedColumn, setFocusedColumn] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  // ── Undo/Redo state ────────────────────────────────────────────────
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);

  const handleUndo = useCallback(() => {
    if (!currentProject || !canUndo) return;
    const snapshot = useHistoryStore.getState().undo(currentProject.lyrics);
    if (snapshot) {
      // Apply restored state WITHOUT snapshotting
      updateAllLines(snapshot.lyrics);
    }
  }, [currentProject, canUndo, updateAllLines]);

  const handleRedo = useCallback(() => {
    if (!currentProject || !canRedo) return;
    const snapshot = useHistoryStore.getState().redo(currentProject.lyrics);
    if (snapshot) {
      updateAllLines(snapshot.lyrics);
    }
  }, [currentProject, canRedo, updateAllLines]);

  // ── Snapshot helpers ────────────────────────────────────────────────

  /** Snapshots current lyrics for simple mutations (add, delete, lock, time adjust). */
  const snapshotLyrics = useCallback(() => {
    const project = useProjectStore.getState().currentProject;
    if (project) {
      useHistoryStore.getState().pushSnapshot(project.lyrics, project.id);
    }
  }, []);

  /**
   * Pushes a snapshot of the previously-active row's pre-edit state.
   * Handles both same-row re-clicks (bug fix #1) and different-row transitions.
   * @param newRowKey - the key of the row being activated, or null if deactivating
   */
  const pushLeavingSnapshot = useCallback(
    (newRowKey: string | null) => {
      const leaving = activeLyricsRef.current;
      if (!leaving || activeLineKey === null) return;
      const project = useProjectStore.getState().currentProject;
      if (!project) return;

      if (activeLineKey === newRowKey) {
        // Same row re-clicked: only push if state actually changed (bug fix #1)
        if (JSON.stringify(project.lyrics) !== JSON.stringify(leaving)) {
          useHistoryStore.getState().pushSnapshot(leaving, project.id);
        }
      } else {
        // Different row: always push
        useHistoryStore.getState().pushSnapshot(leaving, project.id);
      }
    },
    [activeLineKey],
  );

  const tableRef = useRef<HTMLDivElement>(null);
  const activeLyricsRef = useRef<Record<string, LyricLine> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Audio player state ─────────────────────────────────────────────
  const [audioActiveLineKey, setAudioActiveLineKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (id) {
      loadProject(Number(id));
    }
  }, [id, loadProject]);

  const handleAutoTranslate = async () => {
    if (!currentProject) return;
    const lyrics = currentProject.lyrics;
    const entries = Object.entries(lyrics);
    if (entries.length === 0) return;

    // Sort by timestamp
    const sorted = entries
      .slice()
      .sort(([, a], [, b]) => a.time_start - b.time_start);

    // Separate lines into context vs target based on lock + overwrite settings
    const contextLines: Array<{
      timestamp: number;
      original: string;
      translated?: string;
      locked?: boolean;
    }> = [];
    const targetLines: Array<{ timestamp: number; original: string }> = [];

    for (const [, line] of sorted) {
      // Skip instrumental/comment lines (lines with brackets)
      if (line.lyric.startsWith("[") && line.lyric.endsWith("]")) continue;

      if (line.locked) {
        // Locked lines are ALWAYS context-only
        contextLines.push({
          timestamp: line.time_start,
          original: line.lyric,
          translated: line.translation || undefined,
          locked: true,
        });
      } else if (!overwriteTranslations && line.translation?.trim()) {
        // Overwrite OFF + has translation → context only (for consistency)
        contextLines.push({
          timestamp: line.time_start,
          original: line.lyric,
          translated: line.translation,
          locked: false,
        });
      } else {
        // Needs translation: blank line OR overwrite ON with unlocked line
        targetLines.push({
          timestamp: line.time_start,
          original: line.lyric,
        });
      }
    }

    // If nothing to translate, don't call the API
    if (targetLines.length === 0) {
      return; // Silently skip — all lines are either locked or already translated
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

      // Call the AI provider with the pre-built prompt
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

      // Only update UNLOCKED lines that were in the target set
      const updatedLyrics = { ...lyrics };
      const parsedEntries = Array.from(parsedMap.values());
      const targetTimestamps = new Set(targetLines.map((l) => l.timestamp));

      for (const [originalKey, originalLine] of Object.entries(lyrics)) {
        // Skip locked lines
        if (originalLine.locked) continue;
        // Only update lines that were sent for translation
        if (!targetTimestamps.has(originalLine.time_start)) continue;

        const translation = parsedEntries.find(
          (p) => p.time_start === originalLine.time_start,
        );
        if (translation?.lyric.trim()) {
          updatedLyrics[originalKey] = {
            ...originalLine,
            translation: translation.lyric,
          };
        }
      }

      await updateAllLines(updatedLyrics);
      useHistoryStore.getState().pushSnapshot(updatedLyrics, currentProject.id);
      setToastMessage(t("editor.translateSuccess"));
    } catch {
      // silent
    } finally {
      setTranslating(false);
    }
  };

  const handleAddLine = async () => {
    if (!currentProject) return;
    snapshotLyrics();
    const lyrics = { ...currentProject.lyrics };
    const keys = Object.keys(lyrics);
    const newKey = `lrc_${String(keys.length).padStart(2, "0")}`;

    // Default times: start from last line's end, or 0ms
    const lastEnd =
      keys.length > 0 ? lyrics[keys[keys.length - 1]!]!.time_end : 0;
    const startTime = lastEnd + 10; // 10ms after previous end
    const endTime = startTime + 3000; // +3 seconds default

    lyrics[newKey] = {
      time_start: startTime,
      time_end: endTime,
      lyric: "",
      translation: "",
    };
    await updateAllLines(lyrics);
    setActiveLineKey(newKey);
  };

  const handleDeleteLine = async (key: string) => {
    if (!currentProject) return;
    snapshotLyrics();
    const lyrics = { ...currentProject.lyrics };
    delete lyrics[key];
    if (activeLineKey === key) setActiveLineKey(null);
    await updateAllLines(lyrics);
  };

  const handleToggleLock = async (key: string) => {
    if (!currentProject) return;
    snapshotLyrics();
    const { toggleLineLock } = useProjectStore.getState();
    await toggleLineLock(key);
  };

  const STEP_MS = 100; // 0.1 seconds per click

  const handleTimeAdjust = (
    key: string,
    field: "time_start" | "time_end",
    direction: 1 | -1,
  ) => {
    if (!currentProject) return;
    snapshotLyrics();
    const lyrics = currentProject.lyrics;
    const keys = Object.keys(lyrics);
    const idx = keys.indexOf(key);
    if (idx === -1) return;

    const current = lyrics[key]![field];
    const newValue = current + direction * STEP_MS;

    if (field === "time_start") {
      // Min: previous row's time_end (or 0 for first row)
      const min = idx > 0 ? lyrics[keys[idx - 1]!]!.time_end : 0;
      // Max: current row's time_end - STEP_MS
      const max = lyrics[key]!.time_end - STEP_MS;
      if (newValue < min || newValue > max) return;
      updateLine(key, "time_start", newValue);
    } else {
      // time_end
      // Min: current row's time_start + STEP_MS
      const min = lyrics[key]!.time_start + STEP_MS;
      // Max: next row's time_start (or no max for last row)
      const max =
        idx < keys.length - 1 ? lyrics[keys[idx + 1]!]!.time_start : Infinity;
      if (newValue < min || newValue > max) return;
      updateLine(key, "time_end", newValue);
    }
  };

  const handleRowClick = (key: string, column?: string) => {
    if (!currentProject) return;

    // Push snapshot for the row we're leaving (handles same-row re-click bug fix)
    pushLeavingSnapshot(key);

    // Capture pre-edit state of the NEW row
    activeLyricsRef.current = structuredClone(currentProject.lyrics) as Record<
      string,
      LyricLine
    >;

    setActiveLineKey(key);
    if (column) {
      setFocusedColumn(column);
    }
  };

  const handleVerticalTabNavigation = useCallback(
    (targetKey: string, column: string) => {
      // Push snapshot for the row we're leaving
      pushLeavingSnapshot(targetKey);

      // Capture pre-edit state of the NEW row
      const project = useProjectStore.getState().currentProject;
      if (project) {
        activeLyricsRef.current = structuredClone(project.lyrics) as Record<
          string,
          LyricLine
        >;
      }

      setFocusedColumn(column);
      setActiveLineKey(targetKey);
    },
    [pushLeavingSnapshot],
  );

  // Export helpers
  const generateLRC = (useTranslation: boolean): string => {
    if (!currentProject) return "";
    const entries = Object.entries(currentProject.lyrics);
    return entries
      .map(([, line]) => {
        const text = useTranslation
          ? line.translation || line.lyric
          : line.lyric;
        const timestamp = formatMillisecondsToTimestamp(line.time_start);
        return `[${timestamp}] ${text}`;
      })
      .join("\n");
  };

  const generateSRT = (useTranslation: boolean): string => {
    if (!currentProject) return "";
    const entries = Object.entries(currentProject.lyrics);
    return entries
      .map(([, line], i) => {
        const text = useTranslation
          ? line.translation || line.lyric
          : line.lyric;
        const start = formatSrtTimestamp(line.time_start);
        const end = formatSrtTimestamp(line.time_end);
        return `${i + 1}\n${start} --> ${end}\n${text}`;
      })
      .join("\n\n");
  };

  const handleDownload = (
    format: "lrc" | "srt" | "yaml",
    language: "original" | "translated" | "proyecto",
  ) => {
    if (!currentProject) return;

    if (format === "yaml") {
      // YAML export - full project
      downloadProjectAsYaml(currentProject);
      setSaveOpen(false);
      return;
    }

    // LRC or SRT export (existing logic, adapted)
    const useTranslation = language === "translated";
    const content =
      format === "lrc"
        ? generateLRC(useTranslation)
        : generateSRT(useTranslation);
    const ext = format === "lrc" ? ".lrc" : ".srt";
    const suffix = useTranslation ? "_translated" : "_original";
    const filename = `${currentProject.trackName}${suffix}${ext}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setSaveOpen(false);
  };

  useClickOutside(
    tableRef,
    () => {
      pushLeavingSnapshot(null);
      activeLyricsRef.current = null;
      setActiveLineKey(null);
    },
    !!activeLineKey,
    "[data-keep-active]",
  );

  // ── Audio handlers ─────────────────────────────────────────────────

  const handleAudioActiveLineChange = useCallback((key: string | null) => {
    setAudioActiveLineKey(key);
  }, []);

  // Scroll to audio-active row when it changes (debounced to avoid oscillation)
  useEffect(() => {
    if (!audioActiveLineKey) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const el = document.querySelector(`[data-row-key="${audioActiveLineKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      scrollTimeoutRef.current = null;
    }, 50);
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [audioActiveLineKey]);

  const handleAudioUrlChange = useCallback((url: string) => {
    useProjectStore.getState().updateAudioUrl(url);
    // Clear local file when switching to URL
    useProjectStore.getState().clearLocalAudio();
  }, []);

  const handleLocalFileSelect = useCallback((file: File) => {
    const store = useProjectStore.getState();
    // Revoke previous blob URL
    if (store.localAudioSrc) {
      URL.revokeObjectURL(store.localAudioSrc);
    }
    const blobUrl = URL.createObjectURL(file);
    store.setLocalAudioSrc(blobUrl);
  }, []);

  const handleClearAudio = useCallback(() => {
    useProjectStore.getState().clearLocalAudio();
    setAudioActiveLineKey(null);
    // Clear persisted URL too
    useProjectStore.getState().updateAudioUrl(undefined);
  }, []);

  const handleShare = useCallback(async () => {
    if (!currentProject) return;
    setShareLoading(true);
    try {
      const shortId = await createShortShareUrl(currentProject);
      await navigator.clipboard.writeText(getShareBaseUrl() + shortId);
      setToastMessage(t("share.copied"));
    } catch {
      setToastMessage(t("share.error"));
    } finally {
      setShareLoading(false);
    }
  }, [currentProject, t]);

  const handleSync = useCallback(() => {
    setActiveLineKey(null);
    if (audioActiveLineKey) {
      const el = document.querySelector(`[data-row-key="${audioActiveLineKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [audioActiveLineKey]);

  const lyricsEntries = currentProject
    ? Object.entries(currentProject.lyrics)
    : [];

  const sortedLyricLines = useMemo<TimestampedLine[]>(() => {
    if (!currentProject) return [];
    return getSortedLyricLines(currentProject.lyrics);
  }, [currentProject?.lyrics]);

  // ── Keyboard shortcuts ────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, []);

  const handleSeekRelative = useCallback((deltaMs: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      audioRef.current.currentTime + deltaMs / 1000,
    );
  }, []);

  const handleNavigateToLine = useCallback(
    (key: string) => {
      if (!audioRef.current || !currentProject) return;
      const line = currentProject.lyrics[key];
      if (line) {
        const syncOffset = currentProject.syncOffsetMs ?? 0;
        audioRef.current.currentTime = (line.time_start + syncOffset) / 1000;
        setAudioActiveLineKey(key);
      }
    },
    [currentProject],
  );

  const handleOpenRowForEdit = useCallback(
    (key: string) => {
      if (!currentProject) return;
      pushLeavingSnapshot(key);
      activeLyricsRef.current = structuredClone(currentProject.lyrics) as Record<
        string,
        LyricLine
      >;
      setActiveLineKey(key);
      setFocusedColumn("translation");
    },
    [currentProject, pushLeavingSnapshot],
  );

  const handleCloseRow = useCallback(() => {
    pushLeavingSnapshot(null);
    activeLyricsRef.current = null;
    setActiveLineKey(null);
  }, [pushLeavingSnapshot]);

  useEditorShortcuts(
    {
      playPause: handlePlayPause,
      seekRelative: handleSeekRelative,
      navigateToLine: handleNavigateToLine,
      openRowForEdit: handleOpenRowForEdit,
      closeRow: handleCloseRow,
      reSync: handleSync,
    },
    activeLineKey !== null,
    audioActiveLineKey,
    sortedLyricLines,
    true,
  );

  const effectiveAudioSrc = localAudioSrc ?? currentProject?.audioUrl;

  // Memoize all suggestions for all lines to avoid calling hooks inside .map()
  const allSuggestions = useMemo(() => {
    if (!currentProject) return [];
    return lyricsEntries.map(([key, line]) =>
      findAllTranslations(line.lyric, key, currentProject.lyrics),
    );
  }, [lyricsEntries, currentProject]);

  usePageShell({
    onBack: () => {
      useHistoryStore.getState().clear();
      smartBack();
    },
    topbarBg: "bg-surface-container",
    sidebarBg: "bg-surface-container",
    showTopbarBorder: false,
    bodyBg: "bg-surface-container",
    onOpenSettings: () => useModalStore.getState().openSettings(),
    onOpenAbout: () => useModalStore.getState().openAbout(),
  });

  useEffect(() => {
    if (isLoading || !currentProject) {
      useShellStore.getState().setConfig({
        title: isLoading ? "" : t("editor.notFound"),
        leading: undefined,
        actions: undefined,
        bottomBar: undefined,
      });
      return;
    }

    useShellStore.getState().setConfig({
      title: `${currentProject.artistName.join(", ")} - ${currentProject.trackName}`,
      leading: (
        <div className="size-12 rounded-sm overflow-hidden bg-surface-container-highest shrink-0">
          {currentProject.coverUrl ? (
            <img src={currentProject.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="size-5 text-outline-variant/40" />
            </div>
          )}
        </div>
      ),
      actions: (
        <div className="flex items-center gap-3">
          <UndoRedoButton
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
          <button
            onClick={() => navigate(`/edit-project/${id}`)}
            className="h-12 px-4 rounded-[1.3rem] border border-outline text-on-surface-variant hover:bg-secondary-container/30 transition-all flex items-center gap-2 font-label-lg"
          >
            <Edit className="size-4" />
            {t("editor.segmented.edit")}
          </button>
          <SegmentedButton
            segments={[
              { icon: Share2 },
              { label: t("editor.segmented.export"), icon: Download, active: true },
            ]}
            onSelect={(index) => {
              if (index === 0) {
                setShareOpen((prev) => !prev);
              } else {
                setSaveOpen(true);
              }
            }}
            className="rounded-r-lg rounded-l-md"
          />
        </div>
      ),
      bottomBar: (
        <AudioPlayerBar
          audioSrc={effectiveAudioSrc}
          syncOffsetMs={currentProject.syncOffsetMs ?? 0}
          sortedLines={sortedLyricLines}
          onActiveLineChange={handleAudioActiveLineChange}
          onAudioUrlChange={handleAudioUrlChange}
          onLocalFileSelect={handleLocalFileSelect}
          onClearAudio={handleClearAudio}
          audioRef={audioRef}
        />
      ),
    });
  }, [
    isLoading, currentProject, t, navigate, canUndo, canRedo,
    handleUndo, handleRedo, id, effectiveAudioSrc, sortedLyricLines,
    handleAudioActiveLineChange, handleAudioUrlChange, handleLocalFileSelect,
    handleClearAudio, shareLoading, handleShare,
  ]);

  if (isLoading) {
    return (
      <MasterCard bgColor="bg-surface-container-lowest">
        <div className="flex items-center justify-center h-full">
          <M3LoadingIndicator
            size={40}
            style={{ color: "rgb(208, 188, 255)" }}
          />
        </div>
      </MasterCard>
    );
  }

  if (!currentProject) {
    return (
      <MasterCard bgColor="bg-surface-container-lowest">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="font-body-lg text-on-surface-variant">
            {t("editor.notFoundDesc")}
          </p>
          <button
            onClick={() => {
              useHistoryStore.getState().clear();
              navigate("/");
            }}
            className="px-6 py-3 bg-primary-container !text-on-primary-container rounded-full font-label-lg hover:bg-primary hover:text-on-primary transition-all"
          >
            {t("editor.backToDashboard")}
          </button>
        </div>
      </MasterCard>
    );
  }

  return (
    <>
      {/* Translation progress bar — top of viewport, above shell */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-surface-container-highest">
        <div
          className="h-full bg-primary rounded-r-full transition-all duration-500 ease-out"
          style={{ width: `${currentProject.progress}%` }}
        />
      </div>
      <MasterCard bgColor="bg-surface-container-lowest">
        <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-lg pb-20">
          {translating && (
            <LoadingOverlay
              title={t("editor.translating")}
              description={t("editor.translatingDesc").replace(
                "%s",
                AI_PROVIDERS.find((p) => p.value === aiProvider)?.label ??
                  "AI",
              )}
            />
          )}

          <div
            ref={tableRef}
            className="bg-surface-container-low rounded-[32px] overflow-visible flex flex-col shadow-lg border border-outline-variant/10"
          >
            <div className="grid grid-cols-[120px_120px_1fr_1fr] gap-4 p-md bg-surface-container-low rounded-t-[32px] border-b border-outline-variant/20 sticky top-0 z-10 text-on-surface-variant font-label-md text-label-md uppercase tracking-widest px-6">
              <div className="px-2">{t("editor.table.start")}</div>
              <div className="px-2">{t("editor.table.end")}</div>
              <div className="px-2">{t("editor.table.lyric")}</div>
              <div className="px-2">{t("editor.table.translation")}</div>
            </div>

            <div className="flex flex-col p-4 gap-4">
              {lyricsEntries.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-on-surface-variant font-body-lg mb-4">
                    {t("editor.emptyState")}
                  </p>
                  <button
                    onClick={handleAddLine}
                    className="px-6 py-3 bg-primary-container text-on-primary-container rounded-full font-label-lg hover:bg-primary hover:text-on-primary transition-all inline-flex items-center gap-2"
                  >
                    <Plus className="size-5" />
                    {t("editor.addFirstLine")}
                  </button>
                </div>
              )}
              {lyricsEntries.map(([key, line], index) => {
                const isInstrumental =
                  line.lyric.includes("[") && line.lyric.includes("]");
                const isActive = activeLineKey === key;
                const state = isInstrumental
                  ? ("instrumental" as const)
                  : isActive
                    ? ("active" as const)
                    : ("default" as const);
                const suggestions = allSuggestions[index];

                return (
                  <TableRow
                    key={key}
                    rowKey={key}
                    orderedKeys={lyricsEntries.map(([k]) => k)}
                    onNavigateToRow={handleVerticalTabNavigation}
                    timeStart={formatMillisecondsToTimestamp(line.time_start)}
                    timeEnd={formatMillisecondsToTimestamp(line.time_end)}
                    lyric={line.lyric}
                    translation={line.translation}
                    translationPlaceholder={
                      !line.translation
                        ? t("editor.translatePlaceholder")
                        : undefined
                    }
                    suggestions={suggestions}
                    state={state}
                    isAudioActive={audioActiveLineKey === key}
                    focusedColumn={focusedColumn}
                    onRowClick={(column) => handleRowClick(key, column)}
                    onTranslationFocus={() => setFocusedColumn("translation")}
                    onTranslationBlur={(relatedTarget) => {
                      if (
                        tableRef.current &&
                        relatedTarget instanceof Node &&
                        !tableRef.current.contains(relatedTarget)
                      ) {
                        setFocusedColumn(null);
                      }
                    }}
                    onTranslationChange={(value) =>
                      updateLine(key, "translation", value)
                    }
                    onLyricChange={(value) => updateLine(key, "lyric", value)}
                    onLyricFocus={() => setFocusedColumn("lyric")}
                    onLyricBlur={(relatedTarget) => {
                      if (
                        tableRef.current &&
                        relatedTarget instanceof Node &&
                        !tableRef.current.contains(relatedTarget)
                      ) {
                        setFocusedColumn(null);
                      }
                    }}
                    onTimeStartAdd={() =>
                      handleTimeAdjust(key, "time_start", 1)
                    }
                    onTimeStartRemove={() =>
                      handleTimeAdjust(key, "time_start", -1)
                    }
                    onTimeEndAdd={() => handleTimeAdjust(key, "time_end", 1)}
                    onTimeEndRemove={() =>
                      handleTimeAdjust(key, "time_end", -1)
                    }
                    isLocked={line.locked ?? false}
                    onToggleLock={() => handleToggleLock(key)}
                    showLock={!!(aiProvider && aiApiKey)}
                    onDelete={() => handleDeleteLine(key)}
                  />
                );
              })}
            </div>

            {lyricsEntries.length > 0 && (
              <div className="px-6 pb-4">
                <button
                  onClick={handleAddLine}
                  className="w-full py-3 bg-surface-container-high hover:bg-surface-container-highest border-2 border-dashed border-outline-variant/30 rounded-3xl text-on-surface-variant font-label-lg transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" />
                  {t("editor.addNewLine")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating action area — bottom right */}
        <div className={`fixed right-8 z-50 flex flex-col items-end gap-3 ${aiProvider && aiApiKey ? "bottom-28" : "bottom-16"}`}>
          <AnimatePresence>
            <div className="flex items-center gap-3">
            {currentProject &&
              (currentProject.status === PROJECT_STATUS.IN_REVIEW ||
                currentProject.status === PROJECT_STATUS.COMPLETED) && (
                <FloatingActionButton
                  icon={CheckCircle}
                  label={
                    currentProject.status === PROJECT_STATUS.COMPLETED
                      ? t("editor.completed")
                      : t("editor.markCompleted")
                  }
                  onClick={() => useProjectStore.getState().toggleCompleted()}
                  className={`h-14 px-4 rounded-sm ${
                    currentProject.status === PROJECT_STATUS.COMPLETED
                      ? "bg-primary-container text-on-primary-container border-primary-container/50"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border-outline-variant/30"
                  }`}
                />
              )}
            {audioActiveLineKey && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <FloatingActionButton
                  icon={RefreshCw}
                  onClick={handleSync}
                  disabled={!currentProject}
                  className="h-14 w-14 rounded-full bg-tertiary-container text-on-tertiary-container hover:brightness-110 transition-[filter] border-tertiary-container/50"
                  title={t("player.syncTooltip")}
                />
              </motion.div>
            )}
          </div>
          </AnimatePresence>
          {aiProvider && aiApiKey && (
            <FloatingActionButton
              icon={translating ? Loader2 : Sparkles}
              label={
                translating
                  ? t("editor.translating")
                  : t("editor.fab.autoTranslate")
              }
              onClick={handleAutoTranslate}
              disabled={translating}
              className="h-16 px-8 rounded-full bg-tertiary-container text-on-tertiary-container shadow-2xl hover:brightness-110 transition-[filter] border-tertiary-container/50"
            />
          )}
        </div>
      </MasterCard>

      <ExportDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onDownload={handleDownload}
      />

      <ShareDialog
        open={shareOpen}
        project={currentProject}
        onClose={() => setShareOpen(false)}
      />

      <MessageModal
        open={translateError !== null}
        title={t("editor.translateErrorTitle")}
        message={translateError ?? ""}
        confirmLabel={t("common.ok")}
        onClose={() => setTranslateError(null)}
      />

      <Toast
        message={toastMessage ?? ""}
        visible={toastMessage !== null}
        onDismiss={() => setToastMessage(null)}
      />
    </>
  );
}
