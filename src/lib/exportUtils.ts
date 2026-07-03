import type { LyricLine } from "@/types/project";

function sortLinesByTimestamp(
  lyrics: Record<string, LyricLine>,
): LyricLine[] {
  return Object.values(lyrics).sort((a, b) =>
    a.time_start.localeCompare(b.time_start),
  );
}

export function generateLrcContent(
  lyrics: Record<string, LyricLine>,
  useTranslation: boolean,
): string {
  return sortLinesByTimestamp(lyrics)
    .map((line) => {
      const text = useTranslation ? line.translation || line.lyric : line.lyric;
      return `[${line.time_start}] ${text}`;
    })
    .join("\n");
}

export function generateSrtContent(
  lyrics: Record<string, LyricLine>,
  useTranslation: boolean,
): string {
  return sortLinesByTimestamp(lyrics)
    .map((line, index) => {
      const text = useTranslation ? line.translation || line.lyric : line.lyric;
      const start = line.time_start.replace(".", ",");
      const end = line.time_end.replace(".", ",");
      return `${index + 1}\n${start} --> ${end}\n${text}`;
    })
    .join("\n\n");
}

export function downloadTextFile(
  content: string,
  filename: string,
): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
