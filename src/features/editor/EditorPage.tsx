import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/features/shell/AppShell";
import { MasterCard } from "@/features/shell/MasterCard";
import { TableRow } from "./TableRow";
import { SegmentedButton } from "./SegmentedButton";
import { FloatingActionButton } from "./FloatingActionButton";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModalStore } from "@/stores/modalStore";
import { useI18n } from "@/hooks/useI18n";
import { batchTranslate } from "@/services/simplyTranslate";
import {
  Edit,
  Save,
  Sparkles,
  Loader2,
  Plus,
  Download,
  FileText,
} from "lucide-react";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentProject, isLoading, loadProject, updateLine, updateAllLines } =
    useProjectStore();
  const language = useSettingsStore((s) => s.language);
  const [translating, setTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [translateTotal, setTranslateTotal] = useState(0);
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadProject(Number(id));
    }
  }, [id, loadProject]);

  const targetLang = language === "es" ? "es" : language === "pt" ? "pt" : "es";

  const handleAutoTranslate = async () => {
    if (!currentProject) return;
    const lyrics = currentProject.lyrics;
    const entries = Object.entries(lyrics);
    const linesToTranslate = entries
      .filter(([, line]) => {
        if (!line.lyric.trim()) return false;
        if (line.lyric.includes("[") && line.lyric.includes("]")) return false;
        return true;
      })
      .map(([key, line]) => ({ lyric: line.lyric, key }));

    setTranslating(true);
    setTranslateTotal(linesToTranslate.length);
    setTranslateProgress(0);

    try {
      const translations = await batchTranslate(
        linesToTranslate,
        "auto",
        targetLang,
        (current) => setTranslateProgress(current),
      );
      const updatedLyrics = { ...lyrics };
      for (const [key, translation] of Object.entries(translations)) {
        if (updatedLyrics[key]) {
          updatedLyrics[key] = { ...updatedLyrics[key]!, translation };
        }
      }
      await updateAllLines(updatedLyrics);
    } catch {
      // silent
    } finally {
      setTranslating(false);
    }
  };

  const handleAddLine = async () => {
    if (!currentProject) return;
    const lyrics = { ...currentProject.lyrics };
    const keys = Object.keys(lyrics);
    const newKey = `lrc_${String(keys.length).padStart(2, "0")}`;

    // Default times: start from last line's end, or 00:00.00
    const lastEnd =
      keys.length > 0 ? parseTime(lyrics[keys[keys.length - 1]!]!.time_end) : 0;
    const startTime = formatTime(lastEnd);
    const endTime = formatTime(lastEnd + 3000); // +3 seconds default

    lyrics[newKey] = {
      time_start: startTime,
      time_end: endTime,
      lyric: "",
      translation: "",
      comment: "",
    };
    await updateAllLines(lyrics);
    setActiveLineKey(newKey);
  };

  const handleDeleteLine = async (key: string) => {
    if (!currentProject) return;
    const lyrics = { ...currentProject.lyrics };
    delete lyrics[key];
    if (activeLineKey === key) setActiveLineKey(null);
    await updateAllLines(lyrics);
  };

  // Parse "MM:SS.ms" → milliseconds
  function parseTime(time: string): number {
    const [min, rest] = time.split(":");
    const [sec, ms] = rest!.split(".");
    return parseInt(min!) * 60000 + parseInt(sec!) * 1000 + parseInt(ms!) * 10;
  }

  // Format milliseconds → "MM:SS.ms"
  function formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }

  const STEP_MS = 100; // 0.1 seconds per click

  const handleTimeAdjust = (
    key: string,
    field: "time_start" | "time_end",
    direction: 1 | -1,
  ) => {
    if (!currentProject) return;
    const lyrics = currentProject.lyrics;
    const keys = Object.keys(lyrics);
    const idx = keys.indexOf(key);
    if (idx === -1) return;

    const current = parseTime(lyrics[key]![field]);
    const newValue = current + direction * STEP_MS;

    if (field === "time_start") {
      // Min: previous row's time_end (or 0 for first row)
      const min = idx > 0 ? parseTime(lyrics[keys[idx - 1]!]!.time_end) : 0;
      // Max: current row's time_end - STEP_MS
      const max = parseTime(lyrics[key]!.time_end) - STEP_MS;
      if (newValue < min || newValue > max) return;
      updateLine(key, "time_start", formatTime(newValue));
    } else {
      // time_end
      // Min: current row's time_start + STEP_MS
      const min = parseTime(lyrics[key]!.time_start) + STEP_MS;
      // Max: next row's time_start (or no max for last row)
      const max =
        idx < keys.length - 1
          ? parseTime(lyrics[keys[idx + 1]!]!.time_start)
          : Infinity;
      if (newValue < min || newValue > max) return;
      updateLine(key, "time_end", formatTime(newValue));
    }
  };

  const handleRowClick = (key: string) => {
    setActiveLineKey(key);
  };

  const [autoFocusColumn, setAutoFocusColumn] = useState<string | null>(null);

  const handleVerticalTabNavigation = useCallback(
    (targetKey: string, column: string) => {
      setAutoFocusColumn(column);
      setActiveLineKey(targetKey);
    },
    [],
  );

  useEffect(() => {
    if (autoFocusColumn) {
      const timer = setTimeout(() => setAutoFocusColumn(null), 0);
      return () => clearTimeout(timer);
    }
  }, [autoFocusColumn]);

  // Export helpers
  const generateLRC = (useTranslation: boolean): string => {
    if (!currentProject) return "";
    const entries = Object.entries(currentProject.lyrics);
    return entries
      .map(([, line]) => {
        const text = useTranslation
          ? line.translation || line.lyric
          : line.lyric;
        return `[${line.time_start}] ${text}`;
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
        const start = line.time_start.replace(".", ",");
        const end = line.time_end.replace(".", ",");
        return `${i + 1}\n${start} --> ${end}\n${text}`;
      })
      .join("\n\n");
  };

  const handleDownload = (format: "lrc" | "srt", useTranslation: boolean) => {
    const content =
      format === "lrc"
        ? generateLRC(useTranslation)
        : generateSRT(useTranslation);
    const ext = format === "lrc" ? ".lrc" : ".srt";
    const suffix = useTranslation ? "_translated" : "_original";
    const filename = `${currentProject?.trackName ?? "lyrics"}${suffix}${ext}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setSaveOpen(false);
  };

  // Click outside the table to deactivate
  useEffect(() => {
    if (!activeLineKey) return;
    const handler = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setActiveLineKey(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeLineKey]);

  if (isLoading) {
    return (
      <AppShell title={t("editor.loading")} bodyBg="bg-surface-container">
        <MasterCard bgColor="bg-surface-container-lowest">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
        </MasterCard>
      </AppShell>
    );
  }

  if (!currentProject) {
    return (
      <AppShell
        title={t("editor.notFound")}
        onBack={() => navigate("/")}
        bodyBg="bg-surface-container"
      >
        <MasterCard bgColor="bg-surface-container-lowest">
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="font-body-lg text-on-surface-variant">
              {t("editor.notFoundDesc")}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-primary-container !text-on-primary-container rounded-full font-label-lg hover:bg-primary hover:text-on-primary transition-all"
            >
              {t("editor.backToDashboard")}
            </button>
          </div>
        </MasterCard>
      </AppShell>
    );
  }

  const lyricsEntries = Object.entries(currentProject.lyrics);
  const title = `${currentProject.artistName.join(", ")} - ${currentProject.trackName}`;

  return (
    <>
      {/* Translation progress bar — top of viewport, above shell */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-surface-container-highest">
        <div
          className="h-full bg-primary rounded-r-full transition-all duration-500 ease-out"
          style={{ width: `${currentProject.progress}%` }}
        />
      </div>
      <AppShell
        title={title}
        onBack={() => navigate("/")}
        topbarBg="bg-surface-container"
        sidebarBg="bg-surface-container"
        showTopbarBorder={false}
        bodyBg="bg-surface-container"
        onOpenSettings={() => useModalStore.getState().openSettings()}
        onOpenAbout={() => useModalStore.getState().openAbout()}
        actions={
          <SegmentedButton
            segments={[
              { label: t("editor.segmented.edit"), icon: Edit },
              { label: t("editor.segmented.save"), icon: Save, active: true },
            ]}
            onSelect={(index) => {
              if (index === 0) {
                navigate(`/edit-project/${id}`);
              } else {
                setSaveOpen(true);
              }
            }}
          />
        }
      >
        <MasterCard bgColor="bg-surface-container-lowest">
          <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-lg pb-32">
              {translating && (
                <div className="bg-surface-container rounded-3xl p-4 border border-primary/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="size-5 text-primary animate-spin" />
                    <span className="font-label-lg text-on-surface">
                      {t("editor.translating")} {translateProgress} /{" "}
                      {translateTotal}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${translateTotal > 0 ? (translateProgress / translateTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div
                ref={tableRef}
                className="bg-surface-container-low rounded-[32px] overflow-hidden flex flex-col shadow-lg border border-outline-variant/10"
              >
                <div className="grid grid-cols-[120px_120px_1fr_1fr] gap-4 p-md bg-surface-container-low border-b border-outline-variant/20 sticky top-0 z-10 text-on-surface-variant font-label-md text-label-md uppercase tracking-widest px-6">
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
                  {lyricsEntries.map(([key, line]) => {
                    const isInstrumental =
                      line.lyric.includes("[") && line.lyric.includes("]");
                    const isActive = activeLineKey === key;
                    const state = isInstrumental
                      ? ("instrumental" as const)
                      : isActive
                        ? ("active" as const)
                        : ("default" as const);

                    return (
                      <TableRow
                        key={key}
                        rowKey={key}
                        orderedKeys={lyricsEntries.map(([k]) => k)}
                        onNavigateToRow={handleVerticalTabNavigation}
                        autoFocusColumn={isActive ? autoFocusColumn : null}
                        timeStart={line.time_start}
                        timeEnd={line.time_end}
                        lyric={line.lyric}
                        translation={line.translation}
                        translationPlaceholder={
                          !line.translation
                            ? t("editor.translatePlaceholder")
                            : undefined
                        }
                        state={state}
                        onRowClick={() => handleRowClick(key)}
                        onTranslationFocus={() => handleRowClick(key)}
                        onTranslationChange={(value) =>
                          updateLine(key, "translation", value)
                        }
                        onLyricChange={(value) =>
                          updateLine(key, "lyric", value)
                        }
                        onTimeStartAdd={() =>
                          handleTimeAdjust(key, "time_start", 1)
                        }
                        onTimeStartRemove={() =>
                          handleTimeAdjust(key, "time_start", -1)
                        }
                        onTimeEndAdd={() =>
                          handleTimeAdjust(key, "time_end", 1)
                        }
                        onTimeEndRemove={() =>
                          handleTimeAdjust(key, "time_end", -1)
                        }
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

            <FloatingActionButton
              icon={translating ? Loader2 : Sparkles}
              label={
                translating
                  ? `${t("editor.translating")} (${translateProgress}/${translateTotal})`
                  : t("editor.fab.autoTranslate")
              }
              onClick={handleAutoTranslate}
              disabled={true}
            />
          </MasterCard>
      </AppShell>

      {/* Save / Export Modal */}
      {saveOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
            <h3 className="font-title-lg text-on-surface mb-2">
              Export Lyrics
            </h3>
            <p className="font-body-md text-on-surface-variant mb-6">
              Choose format and language to download.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => handleDownload("lrc", false)}
                className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
              >
                <FileText className="size-6 text-primary" />
                <span className="font-label-lg text-on-surface">LRC</span>
                <span className="font-label-md text-on-surface-variant">
                  Original
                </span>
              </button>
              <button
                onClick={() => handleDownload("lrc", true)}
                className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
              >
                <FileText className="size-6 text-tertiary" />
                <span className="font-label-lg text-on-surface">LRC</span>
                <span className="font-label-md text-on-surface-variant">
                  Translated
                </span>
              </button>
              <button
                onClick={() => handleDownload("srt", false)}
                className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
              >
                <Download className="size-6 text-primary" />
                <span className="font-label-lg text-on-surface">SRT</span>
                <span className="font-label-md text-on-surface-variant">
                  Original
                </span>
              </button>
              <button
                onClick={() => handleDownload("srt", true)}
                className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
              >
                <Download className="size-6 text-tertiary" />
                <span className="font-label-lg text-on-surface">SRT</span>
                <span className="font-label-md text-on-surface-variant">
                  Translated
                </span>
              </button>
            </div>
            <button
              onClick={() => setSaveOpen(false)}
              className="w-full py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
