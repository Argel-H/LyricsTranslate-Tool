import { useCallback, useEffect, useRef, useState } from "react";
import { findActiveLine } from "@/lib/timeUtils";
import type { TimestampedLine } from "@/lib/timeUtils";
import { usePlaybackStore } from "@/stores/playbackStore";

export interface UseAudioPlayerOptions {
  projectId: number | null;
  src: string | undefined;
  syncOffsetMs: number;
  sortedLines: TimestampedLine[];
  onActiveLineChange?: (key: string | null) => void;
}

export interface AudioPlayerControls {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  playing: boolean;
  currentTimeMs: number;
  durationMs: number;
  error: boolean;
  buffering: boolean;
  volume: number;
  togglePlay: () => void;
  seekTo: (ms: number) => void;
  seekRelative: (deltaMs: number) => void;
  setVolume: (v: number) => void;
  dismissError: () => void;
}

const DEFAULT_VOLUME = 80;

/** Owns the `<audio>` element, playback state, project-scoped position persistence, and the RAF active-line loop. No-ops when `src` is undefined. */
export function useAudioPlayer(
  options: UseAudioPlayerOptions,
): AudioPlayerControls {
  const { projectId, src, syncOffsetMs, sortedLines, onActiveLineChange } =
    options;

  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastActiveKeyRef = useRef<string | null>(null);
  const durationMsRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    durationMsRef.current = durationMs;
  }, [durationMs]);

  useEffect(() => {
    if (!src) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      setPlaying(false);
      setCurrentTimeMs(0);
      setDurationMs(0);
      setError(false);
      setBuffering(false);
      lastActiveKeyRef.current = null;
      return;
    }

    hasLoadedRef.current = false;

    const audio = new Audio();
    audioRef.current = audio;

    audio.preload = "auto";
    audio.src = src;

    const onLoadedMetadata = () => {
      hasLoadedRef.current = true;
      setDurationMs(audio.duration * 1000);
      setError(false);
      // Only THIS project + src may resume; other projects sharing the URL are ignored.
      if (projectId !== null) {
        const saved = usePlaybackStore
          .getState()
          .restore(projectId, src, audio.duration * 1000);
        if (saved !== null) {
          audio.currentTime = saved / 1000;
          setCurrentTimeMs(saved);
        }
      }
    };

    const onTimeUpdate = () => {
      const timeMs = audio.currentTime * 1000;
      setCurrentTimeMs(timeMs);
      // Persist position keyed by project id so it survives route changes.
      if (projectId !== null) {
        usePlaybackStore.getState().save(projectId, src, timeMs);
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setCurrentTimeMs(durationMsRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const onError = () => {
      if (hasLoadedRef.current) {
        // Recoverable network error - audio was already loaded once
        setBuffering(false);
        setPlaying(false);
      } else {
        // Source never loaded - truly invalid URL or file
        setError(true);
        setPlaying(false);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => {
      setBuffering(false);
      setPlaying(true);
    };
    const onCanPlay = () => setBuffering(false);
    const onStalled = () => setBuffering(true);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("stalled", onStalled);

    return () => {
      // Save playback position keyed by project id before destroying (use ref for safety)
      const el = audioRef.current;
      if (el && el.currentTime > 0 && !el.ended && projectId !== null) {
        usePlaybackStore
          .getState()
          .save(projectId, src, el.currentTime * 1000);
      }
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("stalled", onStalled);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [projectId, src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.pow(volume / 100, 2);
    }
  }, [volume]);

  useEffect(() => {
    if (!playing || !audioRef.current) {
      lastActiveKeyRef.current = null;
      return;
    }

    const tick = () => {
      if (audioRef.current) {
        setCurrentTimeMs(audioRef.current.currentTime * 1000);

        const effectiveTimeMs =
          audioRef.current.currentTime * 1000 - syncOffsetMs;
        const activeKey = findActiveLine(sortedLines, effectiveTimeMs);

        if (activeKey !== lastActiveKeyRef.current) {
          lastActiveKeyRef.current = activeKey;
          onActiveLineChange?.(activeKey);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, syncOffsetMs, sortedLines, onActiveLineChange]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err: DOMException) => {
        if (err.name === "AbortError") return;
        if (!hasLoadedRef.current) setError(true);
      });
    }
  }, [playing]);

  const seekTo = useCallback(
    (ms: number) => {
      if (!audioRef.current || durationMs <= 0) return;
      audioRef.current.currentTime = ms / 1000;
      setCurrentTimeMs(ms);
      if (projectId !== null && src !== undefined) {
        usePlaybackStore.getState().save(projectId, src, ms);
      }
      const activeKey = findActiveLine(sortedLines, ms - syncOffsetMs);
      if (activeKey !== lastActiveKeyRef.current) {
        lastActiveKeyRef.current = activeKey;
        onActiveLineChange?.(activeKey);
      }
    },
    [durationMs, projectId, src, sortedLines, syncOffsetMs, onActiveLineChange],
  );

  const seekRelative = useCallback((deltaMs: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      audioRef.current.currentTime + deltaMs / 1000,
    );
  }, []);

  const dismissError = useCallback(() => setError(false), []);

  return {
    audioRef,
    playing,
    currentTimeMs,
    durationMs,
    error,
    buffering,
    volume,
    togglePlay,
    seekTo,
    seekRelative,
    setVolume,
    dismissError,
  };
}
