import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateLrcContent, generateSrtContent, generateYamlContent } from "./exportUtils";
import { parseProjectYaml } from "./yamlParser";
import { decodeAudioUrl } from "./audioUrlCodec";
import { makeProject, makeLyricLine } from "@/test/factories/project";

describe("generateYamlContent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1720600000000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces valid YAML structure with required fields", () => {
    const project = makeProject({
      lyrics: {
        l1: makeLyricLine({
          time_start: 14500, time_end: 18200,
          lyric: "Remember those walls I built?",
          translation: "¿Recuerdas esos muros que construí?",
        }),
      },
    });
    const result = generateYamlContent(project);
    expect(result).toContain("version: 1");
    expect(result).toContain("project:");
    expect(result).toContain("metadata:");
    expect(result).toContain("lyrics:");
    expect(result).toContain("created_at: 1720000000000");
    expect(result).toContain("exported_at: 1720600000000");
  });

  it("sorts lyrics by time_start and handles locked field", () => {
    const project = makeProject({
      lyrics: {
        l2: makeLyricLine({ time_start: 20000, time_end: 25000, lyric: "Second line", translation: "Segunda línea" }),
        l1: makeLyricLine({ time_start: 10000, time_end: 15000, lyric: "First line", translation: "Primera línea" }),
        l3: makeLyricLine({ locked: true, time_start: 30000, time_end: 35000, lyric: "Third line", translation: "Tercera línea" }),
      },
    });
    const result = generateYamlContent(project);
    const lines = result.split("\n");
    const lyricsStart = lines.findIndex((l) => l.startsWith("lyrics:"));
    const timeStarts = lines.slice(lyricsStart + 1).filter((l) => l.includes("time_start:")).map((l) => l.split(": ")[1]);
    expect(timeStarts).toEqual(["10000", "20000", "30000"]);
    const lockedLines = lines.filter((l) => l.includes("locked:"));
    expect(lockedLines).toHaveLength(1);
    expect(lockedLines[0]).toContain("locked: true");
  });

  it("emits comment for commented lines and omits it for uncommented lines", () => {
    const project = makeProject({
      lyrics: {
        l1: makeLyricLine({
          time_start: 10000, time_end: 15000,
          lyric: "First line",
          translation: "Primera línea",
          comment: "A markdown **note**",
        }),
        l2: makeLyricLine({
          time_start: 20000, time_end: 25000,
          lyric: "Second line",
          translation: "Segunda línea",
        }),
      },
    });
    const result = generateYamlContent(project);
    const commentLines = result.split("\n").filter((l) => l.trim().startsWith("comment:"));
    expect(commentLines).toHaveLength(1);
    expect(commentLines[0]).toBe("    comment: A markdown **note**");
  });

  it("escapes YAML special characters in strings", () => {
    const project = makeProject({
      lyrics: {
        l1: makeLyricLine({
          lyric: 'Line with "quotes" and colon: here',
          translation: "Normal translation",
        }),
      },
    });
    const result = generateYamlContent(project);
    expect(result).toContain('original: "Line with \\"quotes\\" and colon: here"');
  });

  it("quotes strings with leading/trailing spaces", () => {
    const project = makeProject({
      lyrics: {
        l1: makeLyricLine({ lyric: "  leading spaces", translation: "trailing spaces  " }),
      },
    });
    const result = generateYamlContent(project);
    expect(result).toContain('original: "  leading spaces"');
    expect(result).toContain('translated: "trailing spaces  "');
  });

  it("handles streaming_sites with null values", () => {
    const project = makeProject({
      streamingSites: { spotify: "https://spotify.com/track", appleMusic: null },
      lyrics: { l1: makeLyricLine() },
    });
    const result = generateYamlContent(project);
    expect(result).toContain("streaming_sites:");
    expect(result).toContain("spotify: ");
    expect(result).toContain("appleMusic: null");
  });

  it("emits a notes section with escaped markdown strings when notes exist", () => {
    const project = makeProject({
      notes: [
        { id: 0, text: "First free-floating **note**" },
        { id: 1, text: 'Second note: with colon and "quotes"' },
      ],
      lyrics: { l1: makeLyricLine() },
    });
    const result = generateYamlContent(project);
    const lines = result.split("\n");
    const notesIdx = lines.findIndex((l) => l.trim() === "notes:");
    expect(notesIdx).toBeGreaterThan(-1);
    expect(lines[notesIdx + 1]).toBe("  - First free-floating **note**");
    expect(lines[notesIdx + 2]).toBe('  - "Second note: with colon and \\"quotes\\""');
    // The notes section must come after the lyrics section.
    const lyricsIdx = lines.findIndex((l) => l.trim() === "lyrics:");
    expect(notesIdx).toBeGreaterThan(lyricsIdx);
  });

  it("omits the notes section when the project has no notes", () => {
    const project = makeProject({ lyrics: { l1: makeLyricLine() } });
    const result = generateYamlContent(project);
    expect(result).not.toContain("notes:");
    // Empty array also emits no section.
    const emptyNotesProject = makeProject({ notes: [], lyrics: { l1: makeLyricLine() } });
    expect(generateYamlContent(emptyNotesProject)).not.toContain("notes:");
  });

  it("emits notes that round-trip through parseProjectYaml", () => {
    const project = makeProject({
      notes: [{ id: 0, text: "Reminder: check **sources**" }],
      lyrics: { l1: makeLyricLine() },
    });
    const yaml = generateYamlContent(project);
    const parsed = parseProjectYaml(yaml);
    expect(parsed.notes).toEqual(["Reminder: check **sources**"]);
  });

  it("encodes audio_url as b64-prefixed base64 and hides the plain link", () => {
    const plainUrl = "https://example.com/audio.mp3";
    const project = makeProject({
      audioUrl: plainUrl,
      lyrics: { l1: makeLyricLine() },
    });
    const result = generateYamlContent(project);
    expect(result).toContain('audio_url: "b64:');
    expect(result).not.toContain(plainUrl);

    // Extract the emitted value and verify it round-trips to the plain link.
    const line = result.split("\n").find((l) => l.startsWith("  audio_url:"));
    expect(line).toBeDefined();
    const emitted = line!.split(": ")[1].replace(/^"|"$/g, "");
    expect(emitted.startsWith("b64:")).toBe(true);
    expect(decodeAudioUrl(emitted)).toBe(plainUrl);
  });

});

describe("existing export functions remain intact", () => {
  it("generateLrcContent and generateSrtContent still work", () => {
    const lyrics = {
      l1: makeLyricLine({ time_start: 10000, time_end: 15000, lyric: "Hello", translation: "Hola" }),
    };
    expect(generateLrcContent(lyrics, false)).toContain("[00:10.00] Hello");
    expect(generateLrcContent(lyrics, true)).toContain("[00:10.00] Hola");
    const srt = generateSrtContent(lyrics, false);
    expect(srt).toContain("00:00:10,000 --> 00:00:15,000");
    expect(srt).toContain("Hello");
  });
});

describe("text case option", () => {
  it("LRC with uppercase transforms text but leaves timestamp untouched", () => {
    const lyrics = {
      l1: makeLyricLine({ time_start: 10000, time_end: 15000, lyric: "Hello World", translation: "Hola Mundo" }),
    };
    const result = generateLrcContent(lyrics, false, "uppercase");
    expect(result).toContain("[00:10.00] HELLO WORLD");
    expect(result).not.toContain("Hello World");
  });

  it("SRT with lowercase transforms text but leaves timestamps and index untouched", () => {
    const lyrics = {
      l1: makeLyricLine({ time_start: 10000, time_end: 15000, lyric: "HELLO WORLD", translation: "HOLA MUNDO" }),
    };
    const result = generateSrtContent(lyrics, false, "lowercase");
    expect(result).toContain("00:00:10,000 --> 00:00:15,000");
    expect(result).toContain("hello world");
    expect(result).toContain("1\n");
    expect(result).not.toContain("HELLO WORLD");
  });

  it("omitting the third arg produces identical output to current behavior", () => {
    const lyrics = {
      l1: makeLyricLine({ time_start: 10000, time_end: 15000, lyric: "Hello World", translation: "Hola Mundo" }),
    };
    const withoutArg = generateLrcContent(lyrics, false);
    const withOriginal = generateLrcContent(lyrics, false, "original");
    expect(withoutArg).toBe(withOriginal);
    expect(withoutArg).toContain("Hello World");

    const srtWithoutArg = generateSrtContent(lyrics, false);
    const srtWithOriginal = generateSrtContent(lyrics, false, "original");
    expect(srtWithoutArg).toBe(srtWithOriginal);
    expect(srtWithoutArg).toContain("Hello World");
  });

  it("useTranslation: true + uppercase transforms translated text", () => {
    const lyrics = {
      l1: makeLyricLine({ time_start: 10000, time_end: 15000, lyric: "Hello", translation: "Hola" }),
    };
    const result = generateLrcContent(lyrics, true, "uppercase");
    expect(result).toContain("[00:10.00] HOLA");
    expect(result).not.toContain("Hola");
  });
});
