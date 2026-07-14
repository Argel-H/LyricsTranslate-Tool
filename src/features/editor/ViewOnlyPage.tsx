import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { useModalStore } from "@/stores/modalStore";
import { useSharedProjectLoader } from "@/hooks/useSharedProjectLoader";
import { createProject } from "@/db/projectRepository";
import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { getSortedLyricLines } from "@/lib/timeUtils";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { AppShell } from "@/features/shell/AppShell";
import { MasterCard } from "@/features/shell/MasterCard";
import { AudioPlayerBar } from "@/features/editor/AudioPlayerBar";
import { Music, RefreshCw } from "lucide-react";
import { LyricsReadOnlyTable } from "@/features/editor/viewonly/LyricsReadOnlyTable";
import { ProjectInfoModal } from "@/features/editor/viewonly/ProjectInfoModal";
import { LanguageLabel } from "@/components/shared/LanguageLabel";

export function ViewOnlyPage() {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { status, project, errorKey } = useSharedProjectLoader(data);
  const [importing, setImporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  async function handleImport() {
    if (!project) return;
    setImporting(true);
    try { const id = await createProject(project); navigate(`/editor/${id}`, { replace: true }); }
    catch { setImporting(false); }
  }

  const openSettings = useModalStore((s) => s.openSettings);
  const openAbout = useModalStore((s) => s.openAbout);

  const sortedLinesForAudio = useMemo(() => {
    if (!project?.lyrics) return [];
    return getSortedLyricLines(project.lyrics);
  }, [project?.lyrics]);

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
      if (!audioRef.current || !project) return;
      const line = project.lyrics[key];
      if (line) {
        const syncOffset = project.syncOffsetMs ?? 0;
        audioRef.current.currentTime = (line.time_start + syncOffset) / 1000;
        setActiveLineKey(key);
      }
    },
    [project],
  );

  const handleSync = useCallback(() => {
    if (!activeLineKey) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const el = document.querySelector(`[data-row-key="${activeLineKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      scrollTimeoutRef.current = null;
    }, 50);
  }, [activeLineKey]);

  useEditorShortcuts(
    {
      playPause: handlePlayPause,
      seekRelative: handleSeekRelative,
      navigateToLine: handleNavigateToLine,
      openRowForEdit: () => {},
      closeRow: () => {},
      reSync: handleSync,
    },
    false,            // isRowOpen — never editing in view-only
    activeLineKey,    // audioActiveLineKey
    sortedLinesForAudio,
    true,             // enabled
  );

  const scrollToActiveLine = useCallback(() => {
    if (!activeLineKey) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const el = document.querySelector(`[data-row-key="${activeLineKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      scrollTimeoutRef.current = null;
    }, 50);
  }, [activeLineKey]);

  useEffect(() => {
    scrollToActiveLine();
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [activeLineKey, scrollToActiveLine]);

  const loading = status === "loading";
  const error = status === "error" ? (errorKey ? t(errorKey) : t("share.missing")) : null;

  if (loading) {
    return (
      <div className="h-screen bg-surface-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center">
            <M3LoadingIndicator size={40} style={{ color: "rgb(208, 188, 255)" }} />
          </div>
          <span className="font-body-lg text-on-surface-variant">{t("share.decoding")}</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen bg-surface-container flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
            <span className="text-error text-2xl">!</span>
          </div>
          <p className="font-title-md text-on-surface">{error}</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-primary-container text-on-primary-container rounded-full font-label-lg hover:bg-primary hover:text-on-primary transition-all mt-2">
            {t("editor.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  const lyricsEntries = Object.entries(project.lyrics || {}).sort(
    ([, a], [, b]) => a.time_start - b.time_start,
  );
  const totalCount = lyricsEntries.length;
  const completedCount = lyricsEntries.filter(([, l]) => l.lyric?.trim() && l.translation?.trim()).length;
  const artistStr = (project.artistName || []).join(", ");
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const shellActions = (
    <div className="flex items-center gap-3">
      <button onClick={() => setModalOpen(true)} className="w-9 h-9 rounded-full bg-surface-container-highest text-on-surface-variant hover:brightness-125 transition-all flex items-center justify-center font-label-lg" title="Info">
        ⓘ
      </button>
      <button onClick={handleImport} disabled={importing}
        className="px-4 py-2 bg-primary-container text-on-primary-container rounded-full font-label-lg hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50 inline-flex items-center gap-2">
        {importing && <M3LoadingIndicator size={14} />}
        {importing ? t("share.importing") : t("share.importProject")}
      </button>
    </div>
  );

  const bottomBarContent = project?.audioUrl ? (
      <AudioPlayerBar
        audioSrc={project.audioUrl}
        audioRef={audioRef}
        syncOffsetMs={project.syncOffsetMs ?? 0}
        sortedLines={sortedLinesForAudio}
        onActiveLineChange={setActiveLineKey}
        onAudioUrlChange={() => {}}
        onLocalFileSelect={() => {}}
        onClearAudio={() => {}}
        readOnly
      />
  ) : (
    <div className="flex items-center justify-between w-full">
      <span className="font-label-md text-on-surface-variant flex items-center gap-1">
        <LanguageLabel language={project.originLanguage} />
        <span className="mx-0.5">→</span>
        <LanguageLabel language={project.translationLanguage} />
      </span>
      <div className="flex items-center gap-3">
        <span className="font-label-md text-on-surface-variant">{completedCount}/{totalCount}</span>
        <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="font-label-md text-on-surface-variant">{progressPct}%</span>
      </div>
    </div>
  );

  return (
    <>
      <AppShell
        title={`${artistStr} - ${project.trackName}`}
        sidebarBg="bg-surface-container"
        topbarBg="bg-surface-container"
        bodyBg="bg-surface-container"
        showTopbarBorder={false}
        onOpenSettings={openSettings}
        onOpenAbout={openAbout}
        leading={
          <div className="size-12 rounded-sm overflow-hidden bg-surface-container-highest shrink-0">
            {project.coverUrl ? (
              <img src={project.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="size-5 text-outline-variant/40" />
              </div>
            )}
          </div>
        }
        actions={shellActions}
        bottomBar={bottomBarContent}
      >
        <MasterCard bgColor="bg-surface-container-lowest px-9">
          <LyricsReadOnlyTable
            lyricsEntries={lyricsEntries}
            activeLineKey={activeLineKey}
          />
        </MasterCard>
      </AppShell>

      {activeLineKey && (
        <button
          onClick={scrollToActiveLine}
          className="fixed bottom-24 right-8 z-50 h-14 w-14 rounded-full bg-tertiary-container text-on-tertiary-container shadow-xl flex items-center justify-center hover:brightness-110 transition-[filter] border border-tertiary-container/50 pressable"
          title={t("player.syncTooltip")}
        >
          <RefreshCw className="size-5" />
        </button>
      )}

      {modalOpen && project && (
        <ProjectInfoModal project={project} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
