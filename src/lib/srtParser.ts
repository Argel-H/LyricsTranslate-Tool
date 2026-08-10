import type { ParsedLrcLine } from "./lyricsParser";

/**
 * Converts an SRT timestamp (HH:MM:SS,mmm) to milliseconds.
 * Throws if the timestamp is unparseable or values are out of range.
 */
function parseSrtTimestamp(timestamp: string): number {
  // HH:MM:SS,mmm
  const parts = timestamp.split(":");
  if (parts.length !== 3) throw new Error(`Invalid SRT timestamp: ${timestamp}`);
  const hours = parseInt(parts[0]!, 10);
  const minutes = parseInt(parts[1]!, 10);
  const [secondsStr, millisStr] = parts[2]!.split(",");
  const seconds = parseInt(secondsStr!, 10);
  const millis = parseInt(millisStr!, 10);

  if (hours < 0 || hours > 23) throw new Error(`Hours out of range in timestamp: ${timestamp}`);
  if (minutes < 0 || minutes > 59) throw new Error(`Minutes out of range in timestamp: ${timestamp}`);
  if (seconds < 0 || seconds > 59) throw new Error(`Seconds out of range in timestamp: ${timestamp}`);
  if (millis < 0 || millis > 999) throw new Error(`Milliseconds out of range in timestamp: ${timestamp}`);

  return hours * 3_600_000 + minutes * 60_000 + seconds * 1_000 + millis;
}

/**
 * Parses raw SRT content into ParsedLrcLine[].
 * Each SRT block becomes one ParsedLrcLine with timestamp=startTimeMs.
 * Multi-line text within a block is joined with "\n".
 * Returns empty array for empty/invalid input (does not throw).
 */
export function parseSrtContent(raw: string): ParsedLrcLine[] {
  if (!raw || !raw.trim()) return [];

  const blocks = raw.trim().split(/\n\s*\n/);
  const result: ParsedLrcLine[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue; // Need at least index and timestamp line

    // Line 0: index
    // Line 1: timestamp
    const timestampLine = lines[1]?.trim() ?? "";
    const arrowMatch = timestampLine.match(
      /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/,
    );
    if (!arrowMatch) continue; // Skip malformed blocks

    try {
      const timeStartMs = parseSrtTimestamp(arrowMatch[1]!);
      const timeEndMs = parseSrtTimestamp(arrowMatch[2]!);

      if (timeStartMs >= timeEndMs) continue; // Skip invalid blocks

      const text = lines.slice(2).join("\n").trim();
      if (!text) continue; // Skip empty text blocks

      result.push({ timestamp: timeStartMs, text });
    } catch {
      continue;
    }
  }

  return result;
}

/**
 * Validates SRT content and returns specific error messages for structural issues.
 * More strict than parseSrtContent - reports errors instead of silently skipping.
 */
export function validateSrtContent(raw: string): { valid: boolean; error?: string } {
  if (!raw || !raw.trim()) {
    return { valid: false, error: "SRT content is empty" };
  }

  const blocks = raw.trim().split(/\n\s*\n/);
  if (blocks.length === 0 || (blocks.length === 1 && !blocks[0]?.trim())) {
    return { valid: false, error: "No subtitle blocks found" };
  }

  let anyValidBlock = false;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!.trim();
    if (!block) continue;

    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l);
    if (lines.length < 2) {
      return {
        valid: false,
        error: `Block ${i + 1}: incomplete block (needs at least index and timestamp line)`,
      };
    }

    const timestampLine = lines[1]!;
    const arrowMatch = timestampLine.match(
      /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/,
    );
    if (!arrowMatch) {
      return {
        valid: false,
        error: `Block ${i + 1}: invalid or missing timestamp line (expected HH:MM:SS,mmm --> HH:MM:SS,mmm)`,
      };
    }

    try {
      const start = parseSrtTimestamp(arrowMatch[1]!);
      const end = parseSrtTimestamp(arrowMatch[2]!);
      if (start >= end) {
        return {
          valid: false,
          error: `Block ${i + 1}: start time (${arrowMatch[1]}) must be before end time (${arrowMatch[2]})`,
        };
      }
    } catch (e) {
      return { valid: false, error: `Block ${i + 1}: ${(e as Error).message}` };
    }

    // Check that there's text content
    if (lines.length < 3 || lines.slice(2).join("").trim().length === 0) {
      return {
        valid: false,
        error: `Block ${i + 1}: has no text content after timestamp line`,
      };
    }

    anyValidBlock = true;
  }

  if (!anyValidBlock) {
    return { valid: false, error: "No valid subtitle blocks found in SRT content" };
  }

  return { valid: true };
}
