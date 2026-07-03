const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_SECOND = 1_000;

export function parseTimestampToMilliseconds(timestamp: string): number {
  const [minutes, rest] = timestamp.split(":");
  if (!rest) return 0;
  const [seconds, centiseconds] = rest.split(".");
  const mins = parseInt(minutes ?? "0", 10);
  const secs = parseInt(seconds ?? "0", 10);
  const cs = parseInt(centiseconds ?? "0", 10);
  return mins * MILLISECONDS_PER_MINUTE + secs * MILLISECONDS_PER_SECOND + cs * 10;
}

export function formatMillisecondsToTimestamp(milliseconds: number): string {
  const clamped = Math.max(0, milliseconds);
  const minutes = Math.floor(clamped / MILLISECONDS_PER_MINUTE);
  const seconds = Math.floor((clamped % MILLISECONDS_PER_MINUTE) / MILLISECONDS_PER_SECOND);
  const centiseconds = Math.floor((clamped % MILLISECONDS_PER_SECOND) / 10);
  return [
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":") + "." + String(centiseconds).padStart(2, "0");
}
