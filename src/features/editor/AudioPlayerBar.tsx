import { useState, useRef, useEffect } from "react";
import { Play, Pause, Upload, X, Volume2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { findActiveLine } from "@/lib/timeUtils";
import type { TimestampedLine } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import { WavyProgressBar } from "@/components/shared/WavyProgressBar";

interface AudioPlayerBarProps {
  audioSrc: string | undefined;
  syncOffsetMs: number;
  sortedLines: TimestampedLine[];
  onActiveLineChange: (key: string | null) => void;
  onAudioUrlChange: (url: string) => void;
  onLocalFileSelect: (file: File) => void;
  onClearAudio: () => void;
  readOnly?: boolean;
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
}

/**
 * Formats milliseconds to "m:ss" display format (e.g., "1:23").
 */
function formatTime(ms: number): string {
  if (ms <= 0 || !isFinite(ms)) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/**
 * Extracts a human-readable filename from the audio source.
 * For blob URLs (local files), uses the tracked localFileName.
 * For regular URLs, extracts the last path segment.
 */
function getSourceLabel(
  src: string | undefined,
  localName: string | null,
): string {
  if (!src) return "";
  if (src.startsWith("blob:")) {
    return localName ?? "Local file";
  }
  try {
    const url = new URL(src);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    return last ? decodeURIComponent(last) : src;
  } catch {
    return src;
  }
}

export function AudioPlayerBar({
  audioSrc,
  syncOffsetMs,
  sortedLines,
  onActiveLineChange,
  onAudioUrlChange,
  onLocalFileSelect,
  onClearAudio,
  readOnly,
  audioRef: externalAudioRef,
}: AudioPlayerBarProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const [volume, setVolume] = useState(80); // 0-100, logarithmic
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  const { t } = useI18n();

  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = externalAudioRef ?? internalAudioRef;
  const rafRef = useRef<number>(0);
  const lastActiveKeyRef = useRef<string | null>(null);
  const stableKeyRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);
  const durationMsRef = useRef(0);

  // Keep durationMsRef in sync
  useEffect(() => {
    durationMsRef.current = durationMs;
  }, [durationMs]);

  // ──────────────────────────────────────────────
  // Audio element lifecycle
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!audioSrc) {
      // Clean up existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      setPlaying(false);
      setCurrentTimeMs(0);
      setDurationMs(0);
      setAudioError(false);
      lastActiveKeyRef.current = null;
      return;
    }

    // Create fresh audio element
    const audio = new Audio();
    audioRef.current = audio;

    // Preload metadata only (don't autoplay)
    audio.preload = "metadata";
    audio.src = audioSrc;

    const onLoadedMetadata = () => {
      setDurationMs(audio.duration * 1000);
      setAudioError(false);
      // Restore saved playback position from store, then clear it
      const saved = useProjectStore.getState().audioCurrentTime;
      if (saved > 0 && saved < audio.duration * 1000) {
        audio.currentTime = saved / 1000;
        setCurrentTimeMs(saved);
        useProjectStore.getState().setAudioCurrentTime(0);
      }
    };

    const onTimeUpdate = () => {
      const timeMs = audio.currentTime * 1000;
      setCurrentTimeMs(timeMs);
      // Persist position so it survives route changes
      useProjectStore.getState().setAudioCurrentTime(timeMs);
    };

    const onEnded = () => {
      setPlaying(false);
      setCurrentTimeMs(durationMsRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const onError = () => {
      setAudioError(true);
      setPlaying(false);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      // Save playback position before destroying (use ref for safety)
      const el = audioRef.current;
      if (el && el.currentTime > 0 && !el.ended) {
        useProjectStore.getState().setAudioCurrentTime(el.currentTime * 1000);
      }
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioSrc, syncOffsetMs, onActiveLineChange]);

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.pow(volume / 100, 2);
    }
  }, [volume]);

  // ──────────────────────────────────────────────
  // RAF loop for smooth progress during playback
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!playing || !audioRef.current) {
      stableKeyRef.current = null;
      stableCountRef.current = 0;
      return;
    }

    const STABILITY_THRESHOLD = 3; // frames before emitting a new key

    const tick = () => {
      if (audioRef.current) {
        setCurrentTimeMs(audioRef.current.currentTime * 1000);

        const effectiveTimeMs =
          audioRef.current.currentTime * 1000 - syncOffsetMs;
        const activeKey = findActiveLine(sortedLines, effectiveTimeMs);

        if (activeKey) {
          if (activeKey === stableKeyRef.current) {
            stableCountRef.current++;
            if (
              stableCountRef.current >= STABILITY_THRESHOLD &&
              activeKey !== lastActiveKeyRef.current
            ) {
              lastActiveKeyRef.current = activeKey;
              onActiveLineChange(activeKey);
            }
          } else {
            stableKeyRef.current = activeKey;
            stableCountRef.current = 1;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, syncOffsetMs, sortedLines, onActiveLineChange]);

  // ──────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        setAudioError(true);
      });
    }
  };

  function syncActiveLineOnSeek(timeMs: number): void {
    const effectiveTime = timeMs - syncOffsetMs;
    const activeKey = findActiveLine(sortedLines, effectiveTime);
    if (activeKey !== lastActiveKeyRef.current) {
      lastActiveKeyRef.current = activeKey;
      stableKeyRef.current = activeKey;
      stableCountRef.current = 0;
      onActiveLineChange(activeKey ?? null);
    }
  }

  const progressPercent =
    audioSrc && durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col justify-center gap-0 relative min-w-0">
      {/* Main controls row */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Upload + popover */}
        {!readOnly && (
        <div className="relative shrink-0">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="size-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors pressable"
            title={t("player.audioSettings")}
          >
            <Upload className="size-4" />
          </button>

          {/* Settings Popover */}
          {settingsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSettingsOpen(false)}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 bg-surface-container border border-outline-variant/20 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
                {/* Arrow pointing down, centered */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-container border-r border-b border-outline-variant/20 rotate-45" />

                <span className="text-xs font-medium text-on-surface">
                  {t("player.audioSource")}
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInputValue}
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && urlInputValue.trim()) {
                        onAudioUrlChange(urlInputValue.trim());
                        setLocalFileName(null);
                        setUrlInputValue("");
                        setSettingsOpen(false);
                      }
                    }}
                    placeholder={t("player.urlPlaceholder")}
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => {
                      if (urlInputValue.trim()) {
                        onAudioUrlChange(urlInputValue.trim());
                        setLocalFileName(null);
                        setUrlInputValue("");
                        setSettingsOpen(false);
                      }
                    }}
                    disabled={!urlInputValue.trim()}
                    className="px-3 py-2 rounded-lg bg-primary-container text-on-primary-container text-xs font-medium hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed pressable shrink-0"
                  >
                    {t("player.load")}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-outline-variant/10" />
                  <span className="text-[10px] text-on-surface-variant/50">
                    {t("common.or")}
                  </span>
                  <div className="flex-1 border-t border-outline-variant/10" />
                </div>

                <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant text-xs font-medium cursor-pointer transition-colors pressable">
                  <Upload className="size-3.5" />
                  {t("player.chooseFile")}
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLocalFileName(file.name);
                        onLocalFileSelect(file);
                        setSettingsOpen(false);
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>

                {audioSrc && (
                  <button
                    onClick={() => {
                      onClearAudio();
                      setSettingsOpen(false);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-error hover:bg-error/10 text-xs font-medium transition-colors pressable"
                  >
                    <X className="size-3.5" />
                    {t("player.clear")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        )}

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          disabled={!audioSrc || audioError}
          className={cn(
            "size-10 flex items-center justify-center pressable",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            playing
              ? "rounded-2xl bg-primary text-on-primary hover:bg-primary/80"
              : "rounded-[20px] bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary",
          )}
          style={{
            transition:
              "border-radius 0.3s ease, background-color 0.3s ease, color 0.3s ease",
          }}
          title={playing ? t("player.pause") : t("player.play")}
        >
          {playing ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </button>

        <WavyProgressBar
          progress={progressPercent}
          isPlaying={playing}
          interactive={!!audioSrc && durationMs > 0 && !audioError}
          onSeek={(percent) => {
            if (!audioRef.current || durationMs <= 0) return;
            const time = (percent / 100) * durationMs;
            audioRef.current.currentTime = time / 1000;
            setCurrentTimeMs(time);
            useProjectStore.getState().setAudioCurrentTime(time);
            syncActiveLineOnSeek(time);
          }}
          leftLabel={formatTime(currentTimeMs)}
          rightLabel={formatTime(durationMs)}
        />

        {/* Source chip */}
        {!audioSrc ? (
          <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full shrink-0">
            {t("player.sourceNone")}
          </span>
        ) : audioSrc.startsWith("blob:") ? (
          <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full shrink-0">
            {t("player.sourceLocal")}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
            {t("player.sourceUrl")}
          </span>
        )}

        {/* Volume control */}
        <div className="flex items-center gap-1 shrink-0">
          <Volume2 className="size-3.5 text-on-surface-variant" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 h-1 rounded-full appearance-none bg-surface-container-highest cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      </div>

      {/* Filename display — only when audio is loaded */}
      {audioSrc && (
        <div className="flex justify-center items-center -mt-3 min-w-0">
          <span className="text-[10px] font-mono text-on-surface-variant/60 truncate max-w-[320px]">
            {getSourceLabel(audioSrc, localFileName)}
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {audioError && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high/80 backdrop-blur-sm rounded-lg">
          <div className="flex items-center gap-2 text-error text-sm">
            <Volume2 className="size-4" />
            <span>{t("player.unavailable")}</span>
            <button
              onClick={() => {
                setAudioError(false);
                onClearAudio();
              }}
              className="ml-2 px-2 py-1 rounded-full bg-error/10 hover:bg-error/20 text-xs font-medium transition-colors"
            >
              {t("player.dismiss")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
