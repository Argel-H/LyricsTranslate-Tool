import { useState, useRef, useEffect, useMemo, useId } from "react";
import { cn } from "@/lib/utils";

// ── Wavy progress bar constants ────────────────────────────────────────
const WAVE_VIEWBOX_WIDTH = 1000;
const WAVE_HEIGHT = 20;
const WAVE_AMPLITUDE = 2.4;
const WAVE_FREQUENCY = 20;
const WAVE_STROKE_WIDTH = 6;

/**
 * Generates an SVG path `d` attribute for a sine wave.
 */
function generateWavePath(
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  phase: number = 0,
): string {
  const centerY = height / 2;
  const points: string[] = [];
  const step = 2;
  for (let x = 0; x <= width; x += step) {
    const y =
      centerY +
      amplitude * Math.sin((x / width) * frequency * Math.PI * 2 + phase);
    points.push(`${x},${y}`);
  }
  return `M ${points.join(" L ")}`;
}

export interface WavyProgressBarProps {
  /** Progress percentage 0-100 */
  progress: number;
  /** Whether the wave should animate */
  isPlaying?: boolean;
  /** Whether the user can click/drag to seek */
  interactive?: boolean;
  /** Called when user clicks/drags to a new position (value 0-100) */
  onSeek?: (percent: number) => void;
  /** Optional label on the left side */
  leftLabel?: string;
  /** Optional label on the right side */
  rightLabel?: string;
  /** Custom className for the outer container */
  className?: string;
}

export function WavyProgressBar({
  progress,
  isPlaying = false,
  interactive = false,
  onSeek,
  leftLabel,
  rightLabel,
  className,
}: WavyProgressBarProps) {
  const clipPathId = useId();
  const trackClipPathId = `${clipPathId}-track`;

  const [isDragging, setIsDragging] = useState(false);
  const [wavePhase, setWavePhase] = useState(0);
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const waveAnimRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const targetAmplitude = isPlaying ? WAVE_AMPLITUDE : 0;

  // ── Wave phase animation + amplitude lerp (wavy when playing, straight when paused) ──
  useEffect(() => {
    let phaseStartTime = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - phaseStartTime) / 1000;
      setWavePhase((elapsed * Math.PI * 2) % (Math.PI * 2));

      setCurrentAmplitude((prev) => {
        const diff = targetAmplitude - prev;
        if (Math.abs(diff) < 0.02) return targetAmplitude;
        return prev + diff * 0.12;
      });

      waveAnimRef.current = requestAnimationFrame(tick);
    };

    waveAnimRef.current = requestAnimationFrame(tick);

    return () => {
      if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);
    };
  }, [isPlaying, targetAmplitude]);

  // ── Dynamic progress wave path updated at ~60 fps when playing ──
  const progressWavePath = useMemo(
    () =>
      generateWavePath(
        WAVE_VIEWBOX_WIDTH,
        WAVE_HEIGHT,
        currentAmplitude,
        WAVE_FREQUENCY,
        wavePhase,
      ),
    [currentAmplitude, wavePhase],
  );

  // ── Seek handlers (mouse-based, percent 0-100) ──
  const getProgressFromPosition = (clientX: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100),
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    const percent = getProgressFromPosition(e.clientX);
    onSeek?.(percent);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !interactive) return;
    const percent = getProgressFromPosition(e.clientX);
    onSeek?.(percent);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ── Global mouseup to catch release outside the bar ──
  useEffect(() => {
    const onUp = () => setIsDragging(false);
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  return (
    <div className={cn("flex-1 flex items-center gap-2 min-w-0", className)}>
      {leftLabel !== undefined && (
        <span className="text-xs font-mono text-on-surface-variant w-10 text-right tabular-nums">
          {leftLabel}
        </span>
      )}

      <div
        ref={progressBarRef}
        className="group relative flex flex-1 items-center h-5"
        style={{
          cursor: interactive ? "pointer" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Progress"
      >
        <svg
          width="100%"
          height={WAVE_HEIGHT}
          viewBox={`0 0 ${WAVE_VIEWBOX_WIDTH} ${WAVE_HEIGHT}`}
          preserveAspectRatio="none"
          className="block"
        >
          <defs>
            <clipPath id={clipPathId}>
              <rect x="0" y="0" width={`${progress}%`} height="100%" />
            </clipPath>
            <clipPath id={trackClipPathId}>
              <rect
                x={`${progress}%`}
                y="0"
                width={`${100 - progress}%`}
                height="100%"
              />
            </clipPath>
          </defs>

          {/* Track (background) — straight gray line, only visible in unplayed portion */}
          <line
            x1="0"
            y1={WAVE_HEIGHT / 2}
            x2={WAVE_VIEWBOX_WIDTH}
            y2={WAVE_HEIGHT / 2}
            stroke="#49454F"
            strokeWidth={WAVE_STROKE_WIDTH}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${trackClipPathId})`}
          />

          {/* Progress wave (filled) — purple, animated when playing */}
          <path
            d={progressWavePath}
            stroke="#D0BCFF"
            fill="none"
            strokeWidth={WAVE_STROKE_WIDTH}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${clipPathId})`}
            className="transition-[filter] duration-200 group-hover:brightness-125"
          />
        </svg>

        {/* Thumb indicator */}
        {interactive && progress > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-5 rounded-full bg-primary shadow-md shadow-primary/40 pointer-events-none z-10"
            style={{
              left: `calc(${progress}% - 7px)`,
            }}
          />
        )}
      </div>

      {rightLabel !== undefined && (
        <span className="text-xs font-mono text-on-surface-variant w-10 tabular-nums">
          {rightLabel}
        </span>
      )}
    </div>
  );
}

export default WavyProgressBar;
