import type { ProjectCreateInput, LyricLine } from "@/types/project";

// ---------------------------------------------------------------------------
// Simple line-by-line YAML parser
// ---------------------------------------------------------------------------
// Parses a strict, known YAML structure (the format exported by this app).
// This is NOT a general-purpose YAML parser — it handles only the subset of
// YAML that our export produces: top-level scalars, nested maps, string
// arrays, and arrays of objects with known keys.
//
// Supported constructs:
//   key: value              → scalar (string, number, boolean, null)
//   key:                    → nested map (children indented +2)
//   key: []                 → empty array
//   key: {}                 → empty object
//   - value                 → array item (simple value)
//   - key: value            → object in array (first property on same line)
//   # comment               → skipped
//
// Quoted strings ("...") are unquoted; \" and \\ escapes are handled.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

/** The intermediate type produced by the raw YAML parser phase. */
type RawYamlValue =
  | string
  | number
  | boolean
  | null
  | RawYamlValue[]
  | { [key: string]: RawYamlValue };

// ---------------------------------------------------------------------------
// Scalar parsing
// ---------------------------------------------------------------------------

/**
 * Converts a raw YAML value string into its typed JavaScript value.
 * Handles quoted strings, booleans, null, integers, and inline containers.
 */
function parseScalar(raw: string): RawYamlValue {
  const trimmed = raw.trim();

  // Empty → null
  if (trimmed === "" || trimmed === "null" || trimmed === "~") return null;

  // Boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // Inline empty container
  if (trimmed === "{}") return {};
  if (trimmed === "[]") return [];

  // Integer (must not be a quoted string or contain decimals)
  if (/^-?\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num)) return num;
  }

  // Quoted string — unquote and process escapes
  if (trimmed.startsWith('"')) {
    return unquoteYamlString(trimmed);
  }

  // Plain string
  return trimmed;
}

/**
 * Unquotes a double-quoted YAML string, handling `\"` and `\\` escapes.
 * Expects the string to start and end with `"`.
 */
function unquoteYamlString(raw: string): string {
  // Strip surrounding quotes
  const inner = raw.slice(1, -1);

  const result: string[] = [];
  let i = 0;
  while (i < inner.length) {
    const ch = inner[i]!;
    if (ch === "\\" && i + 1 < inner.length) {
      const next = inner[i + 1]!;
      if (next === '"') {
        result.push('"');
        i += 2;
        continue;
      }
      if (next === "\\") {
        result.push("\\");
        i += 2;
        continue;
      }
      // Any other escape sequence — pass through as-is
      result.push(ch);
      i += 1;
      continue;
    }
    result.push(ch);
    i += 1;
  }
  return result.join("");
}

// ---------------------------------------------------------------------------
// Indentation helpers
// ---------------------------------------------------------------------------

/** Returns the number of leading space characters. */
function countLeadingSpaces(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === " ") count++;
    else break;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Recursive-descent line parser
// ---------------------------------------------------------------------------

/**
 * Starting at `startIdx` in `lines`, parses all lines whose indentation is
 * *strictly greater* than `baseIndent`, building a tree of plain objects,
 * arrays, and scalar values.
 *
 * Returns the parsed value and the index of the first line NOT consumed.
 */
function parseBlock(
  lines: string[],
  startIdx: number,
  baseIndent: number,
): { result: RawYamlValue; nextIdx: number } {
  const result: { [key: string]: RawYamlValue } = {};
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i]!;

    // Skip blank lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const indent = countLeadingSpaces(line);

    // If indentation is at or shallower than the caller's level, stop
    if (indent <= baseIndent) break;

    const content = line.trim();

    // ---------------------------------------------------------------
    // Array items: lines starting with "- "
    // ---------------------------------------------------------------
    if (content.startsWith("- ")) {
      const items: RawYamlValue[] = [];
      i = parseArrayItems(lines, i, indent, items);
      return { result: items, nextIdx: i };
    }

    // ---------------------------------------------------------------
    // Map entries: key: value  or  key:  (with children)
    // ---------------------------------------------------------------
    if (content.includes(":")) {
      const colonIdx = content.indexOf(":");
      const key = content.substring(0, colonIdx).trim();

      // Edge-case: key must be non-empty
      if (key.length === 0) {
        // Malformed — skip silently but advance
        i++;
        continue;
      }

      const afterColon = content.substring(colonIdx + 1);

      if (afterColon.trim() === "") {
        // "key:" with nothing after → nested object (children at deeper indent)
        const subResult = parseBlock(lines, i + 1, indent);
        result[key] = subResult.result;
        i = subResult.nextIdx;
      } else {
        // "key: value" → scalar
        result[key] = parseScalar(afterColon);
        i++;
      }
    } else {
      // Line that doesn't match any expected pattern — skip
      i++;
    }
  }

  return { result, nextIdx: i };
}

/**
 * Parses one or more consecutive array items (`- ...`) at the given indent
 * level, appending each parsed item into `items`.
 *
 * Assumes `lines[startIdx]` has already been confirmed to start with `- ` at
 * the expected indent. This function processes the first item and then loops
 * to collect siblings.
 */
function parseArrayItems(
  lines: string[],
  startIdx: number,
  itemIndent: number,
  items: RawYamlValue[],
): number {
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const indent = countLeadingSpaces(line);
    if (indent !== itemIndent) break;

    const content = line.trim();
    if (!content.startsWith("- ")) break;

    const body = content.substring(2).trim();

    // Determine if this item is a simple value or an object
    if (body.includes(":") && !body.startsWith('"') && !body.includes('":')) {
      // Object-type item: "key: value" or "key:"
      const colonIdx = body.indexOf(":");
      const key = body.substring(0, colonIdx).trim();
      const afterColon = body.substring(colonIdx + 1).trim();

      const itemObj: { [key: string]: RawYamlValue } = {};

      if (afterColon === "") {
        // "- key:" → nested object inside array item
        const subResult = parseBlock(lines, i + 1, indent);
        itemObj[key] = subResult.result;
        i = subResult.nextIdx;
      } else {
        // "- key: value" → first property on this line
        itemObj[key] = parseScalar(afterColon);

        // Collect sub-properties at deeper indent
        const subResult = parseBlock(lines, i + 1, indent);
        Object.assign(itemObj, subResult.result as Record<string, RawYamlValue>);
        i = subResult.nextIdx;
      }

      items.push(itemObj);
    } else {
      // Simple value item
      items.push(parseScalar(body));
      i++;
    }
  }

  return i;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a YAML string (in the strict format exported by this app) and
 * converts it to a `ProjectCreateInput` ready for `createProject()`.
 *
 * @param yamlString - Raw YAML text.
 * @returns A validated ProjectCreateInput object.
 * @throws {Error} Descriptive error on malformed input or missing required
 *   fields.
 */
export function parseProjectYaml(yamlString: string): ProjectCreateInput {
  if (typeof yamlString !== "string" || yamlString.trim().length === 0) {
    throw new Error("YAML input is empty or not a string");
  }

  const lines = yamlString.split("\n");
  const parsed = parseBlock(lines, 0, -1);
  const raw = parsed.result as Record<string, RawYamlValue>;

  // ------------------------------------------------------------------
  // Validate the top-level structure and required fields
  // ------------------------------------------------------------------

  // version
  if (raw.version == null) {
    throw new Error("Missing required field: version");
  }
  if (typeof raw.version !== "number" || !Number.isFinite(raw.version)) {
    throw new Error(
      `Invalid version: expected a number, got ${JSON.stringify(raw.version)}`,
    );
  }

  // project
  const projectRaw = raw.project as Record<string, RawYamlValue> | undefined;
  if (!projectRaw || typeof projectRaw !== "object" || Array.isArray(projectRaw)) {
    throw new Error("Missing or invalid required section: project");
  }

  const trackName = projectRaw.track_name;
  if (typeof trackName !== "string" || trackName.trim().length === 0) {
    throw new Error(
      "Missing or invalid required field: project.track_name must be a non-empty string",
    );
  }

  const artists = projectRaw.artists;
  if (!Array.isArray(artists) || artists.length === 0) {
    throw new Error(
      "Missing or invalid required field: project.artists must be a non-empty array",
    );
  }

  // lyrics
  const lyricsRaw = raw.lyrics;
  if (!Array.isArray(lyricsRaw)) {
    throw new Error(
      "Missing or invalid required field: lyrics must be an array",
    );
  }

  // ------------------------------------------------------------------
  // Build the ProjectCreateInput from parsed data
  // ------------------------------------------------------------------

  const lyricsMap: Record<string, LyricLine> = {};
  for (let idx = 0; idx < lyricsRaw.length; idx++) {
    const line = lyricsRaw[idx] as Record<string, RawYamlValue> | undefined;
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      throw new Error(`Invalid lyric entry at index ${idx}: expected an object`);
    }

    const key = `lrc_${String(idx).padStart(2, "0")}`;
    lyricsMap[key] = {
      time_start: String(line.time_start ?? ""),
      time_end: String(line.time_end ?? ""),
      lyric: String(line.original ?? ""),
      translation: String(line.translated ?? ""),
      comment: "",
      locked: line.locked === true,
    };
  }

  const input: ProjectCreateInput = {
    artistName: artists.map(String),
    trackName: trackName.trim(),
    lyrics: lyricsMap,
  };

  // Optional scalar fields
  if (projectRaw.album_name != null) {
    input.albumName = String(projectRaw.album_name);
  }
  if (projectRaw.cover_url != null) {
    input.coverUrl = String(projectRaw.cover_url);
  }
  if (projectRaw.isrcs != null) {
    input.isrcs = String(projectRaw.isrcs);
  }
  if (projectRaw.origin_language != null) {
    input.originLanguage = String(projectRaw.origin_language);
  }
  if (projectRaw.translation_language != null) {
    input.translationLanguage = String(projectRaw.translation_language);
  }
  if (projectRaw.song_link != null) {
    input.songLinkUrl = String(projectRaw.song_link);
  }
  if (projectRaw.audio_url != null) {
    input.audioUrl = String(projectRaw.audio_url);
  }
  if (projectRaw.sync_offset_ms != null) {
    input.syncOffsetMs = Number(projectRaw.sync_offset_ms);
  }

  // Optional array fields
  if (Array.isArray(projectRaw.artist_links)) {
    input.artistLinks = projectRaw.artist_links.map(
      (item: RawYamlValue) => {
        const obj = item as Record<string, RawYamlValue>;
        return {
          name: String(obj.name ?? ""),
          url: String(obj.url ?? ""),
        };
      },
    );
  }

  if (Array.isArray(projectRaw.social_links)) {
    input.recommendedSocialLinks = projectRaw.social_links.map(
      (item: RawYamlValue) => {
        const obj = item as Record<string, RawYamlValue>;
        return {
          platform: String(obj.platform ?? ""),
          url: String(obj.url ?? ""),
          artistName: obj.artist_name != null ? String(obj.artist_name) : undefined,
        };
      },
    );
  }

  // Optional record field
  if (
    projectRaw.streaming_sites != null &&
    typeof projectRaw.streaming_sites === "object" &&
    !Array.isArray(projectRaw.streaming_sites)
  ) {
    input.streamingSites = projectRaw.streaming_sites as Record<string, string | null>;
  }

  return input;
}
