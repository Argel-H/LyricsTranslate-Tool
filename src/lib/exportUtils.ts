import type { LyricLine, Project } from "@/types/project";

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

/**
 * Escapes a string value for safe inclusion in a YAML document.
 * Wraps in double quotes if the value contains special YAML characters
 * (:, #, ", ', newlines) or starts/ends with spaces.
 */
function escapeYamlValue(value: string): string {
  if (value === "") return '""';

  // Check if quoting is required
  const needsQuoting = /[:#"'\n]|^\s|\s$/.test(value);
  if (!needsQuoting) {
    return value;
  }

  // Escape backslashes first, then double quotes
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Generates a YAML string representation of a Project.
 * The output matches the ProjectYaml structure exactly, with 2-space indentation,
 * sorted lyrics, and optional fields omitted when null/undefined.
 */
export function generateYamlContent(project: Project): string {
  const lines: string[] = [];

  // Sort lyrics by time_start before serializing
  const sortedLyrics = Object.values(project.lyrics).sort((a, b) =>
    a.time_start.localeCompare(b.time_start),
  );

  // --- version ---
  lines.push("version: 1");
  lines.push("");

  // --- project section ---
  lines.push("project:");
  lines.push(`  title: ${escapeYamlValue(project.title)}`);
  lines.push(`  track_name: ${escapeYamlValue(project.trackName)}`);

  // artists array
  lines.push("  artists:");
  for (const artist of project.artistName) {
    lines.push(`    - ${escapeYamlValue(artist)}`);
  }

  // optional fields in project section
  if (project.albumName != null) {
    lines.push(`  album_name: ${escapeYamlValue(project.albumName)}`);
  }
  if (project.coverUrl != null) {
    lines.push(`  cover_url: ${escapeYamlValue(project.coverUrl)}`);
  }
  if (project.isrcs != null) {
    lines.push(`  isrcs: ${escapeYamlValue(project.isrcs)}`);
  }
  if (project.originLanguage != null) {
    lines.push(`  origin_language: ${escapeYamlValue(project.originLanguage)}`);
  }
  if (project.translationLanguage != null) {
    lines.push(`  translation_language: ${escapeYamlValue(project.translationLanguage)}`);
  }
  if (project.songLinkUrl != null) {
    lines.push(`  song_link: ${escapeYamlValue(project.songLinkUrl)}`);
  }
  if (project.audioUrl != null) {
    lines.push(`  audio_url: ${escapeYamlValue(project.audioUrl)}`);
  }
  if (project.syncOffsetMs != null) {
    lines.push(`  sync_offset_ms: ${project.syncOffsetMs}`);
  }

  // artist_links (optional array of objects)
  if (project.artistLinks != null && project.artistLinks.length > 0) {
    lines.push("  artist_links:");
    for (const link of project.artistLinks) {
      lines.push(`    - name: ${escapeYamlValue(link.name)}`);
      lines.push(`      url: ${escapeYamlValue(link.url)}`);
    }
  }

  // social_links (optional array of objects with optional artist_name)
  if (project.recommendedSocialLinks != null && project.recommendedSocialLinks.length > 0) {
    lines.push("  social_links:");
    for (const link of project.recommendedSocialLinks) {
      lines.push(`    - platform: ${escapeYamlValue(link.platform)}`);
      lines.push(`      url: ${escapeYamlValue(link.url)}`);
      if (link.artistName != null) {
        lines.push(`      artist_name: ${escapeYamlValue(link.artistName)}`);
      }
    }
  }

  // streaming_sites (optional record)
  if (project.streamingSites != null && Object.keys(project.streamingSites).length > 0) {
    lines.push("  streaming_sites:");
    for (const [key, value] of Object.entries(project.streamingSites)) {
      if (value !== null) {
        lines.push(`    ${key}: ${escapeYamlValue(value)}`);
      } else {
        lines.push(`    ${key}: null`);
      }
    }
  }

  // --- metadata section ---
  lines.push("");
  lines.push("metadata:");
  lines.push(`  created_at: ${project.createdAt}`);
  lines.push(`  updated_at: ${project.updatedAt}`);
  lines.push(`  exported_at: ${Date.now()}`);

  // --- lyrics section ---
  lines.push("");
  lines.push("lyrics:");
  for (const line of sortedLyrics) {
    lines.push(`  - time_start: ${escapeYamlValue(line.time_start)}`);
    lines.push(`    time_end: ${escapeYamlValue(line.time_end)}`);
    lines.push(`    original: ${escapeYamlValue(line.lyric)}`);
    lines.push(`    translated: ${escapeYamlValue(line.translation)}`);
    // locked is optional — only include when explicitly set (omitted if undefined)
    if (line.locked !== undefined) {
      lines.push(`    locked: ${line.locked}`);
    }
  }

  return lines.join("\n");
}

/**
 * Triggers a browser download of the project as a YAML file.
 * Uses generateYamlContent internally; handles Blob creation, download, and cleanup.
 */
export function downloadProjectAsYaml(project: Project): void {
  const content = generateYamlContent(project);
  const filename = `${project.trackName}_project.yaml`;
  const blob = new Blob([content], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
