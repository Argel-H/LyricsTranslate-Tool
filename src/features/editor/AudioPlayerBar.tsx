import { useState } from "react";
import { Play, Pause, Upload, X, Volume2 } from "lucide-react";
import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { useI18n } from "@/hooks/useI18n";
import { formatMillisecondsToTimestamp } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";
import { WavyProgressBar } from "@/components/shared/WavyProgressBar";

interface AudioPlayerBarProps {
  playing: boolean;
  currentTimeMs: number;
  durationMs: number;
  error: boolean;
  buffering: boolean;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onVolumeChange: (v: number) => void;
  src: string | undefined;
  readOnly?: boolean;
  onAudioUrlChange?: (url: string) => void;
  onLocalFileSelect?: (file: File) => void;
  onClearAudio?: () => void;
  onDismissError?: () => void;
}

function formatTime(ms: number): string {
  if (ms <= 0 || !isFinite(ms)) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function formatTimePrecise(ms: number): string {
  if (ms <= 0 || !isFinite(ms)) return "0:00.00";
  return formatMillisecondsToTimestamp(ms);
}

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
  playing,
  currentTimeMs,
  durationMs,
  error,
  buffering,
  volume,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  src,
  readOnly,
  onAudioUrlChange,
  onLocalFileSelect,
  onClearAudio,
  onDismissError,
}: AudioPlayerBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  const { t } = useI18n();

  const progressPercent =
    src && durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col justify-center gap-0 relative min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        {!readOnly && (
        <div className="relative shrink-0">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="size-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors pressable"
            title={t("player.audioSettings")}
          >
            <Upload className="size-4" />
          </button>

          {settingsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSettingsOpen(false)}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 bg-surface-container border border-outline-variant/20 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
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
                        onAudioUrlChange?.(urlInputValue.trim());
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
                        onAudioUrlChange?.(urlInputValue.trim());
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
                        onLocalFileSelect?.(file);
                        setSettingsOpen(false);
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>

                {src && (
                  <button
                    onClick={() => {
                      onClearAudio?.();
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

        <button
          onClick={onTogglePlay}
          disabled={!src || error}
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
          title={buffering ? t("player.buffering") : playing ? t("player.pause") : t("player.play")}
        >
          {buffering ? (
            <M3LoadingIndicator size={24} style={{ color: "#594983" }} />
          ) : playing ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </button>

        <WavyProgressBar
          progress={progressPercent}
          isPlaying={playing}
          interactive={!!src && durationMs > 0 && !error}
          onSeek={(percent) => onSeek((percent / 100) * durationMs)}
          leftLabel={formatTime(currentTimeMs)}
          rightLabel={formatTime(durationMs)}
          leftLabelTooltip={formatTimePrecise(currentTimeMs)}
          rightLabelTooltip={formatTimePrecise(durationMs)}
        />

        {!src ? (
          <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full shrink-0">
            {t("player.sourceNone")}
          </span>
        ) : src.startsWith("blob:") ? (
          <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full shrink-0">
            {t("player.sourceLocal")}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
            {t("player.sourceUrl")}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <Volume2 className="size-3.5 text-on-surface-variant" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-24 h-1 rounded-full appearance-none bg-surface-container-highest cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      </div>

      {src && (
        <div className="flex justify-center items-center -mt-3 min-w-0">
          <span className="text-[10px] font-mono text-on-surface-variant/60 truncate max-w-[320px]">
            {getSourceLabel(src, localFileName)}
          </span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high/80 backdrop-blur-sm rounded-lg">
          <div className="flex items-center gap-2 text-error text-sm">
            <Volume2 className="size-4" />
            <span>{t("player.unavailable")}</span>
            <button
              onClick={() => {
                onDismissError?.();
                onClearAudio?.();
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
