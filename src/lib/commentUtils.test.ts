import { describe, it, expect } from "vitest";
import {
  applyCommentToMatchingLines,
  buildCommentIndex,
  buildCommentList,
  getCommentForLine,
} from "./commentUtils";
import type { LyricLine } from "@/types/project";

/** Minimal LyricLine factory for index tests. */
function makeLine(overrides: Partial<LyricLine> = {}): LyricLine {
  return {
    time_start: 0,
    time_end: 1000,
    lyric: "Hello",
    translation: "Hola",
    ...overrides,
  };
}

describe("buildCommentIndex", () => {
  it("maps trimmed original lyric text to its comment", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Hello", comment: "First line note" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "World", comment: "Second line note" }),
    };
    const index = buildCommentIndex(lyrics);
    expect(index.get("Hello")).toBe("First line note");
    expect(index.get("World")).toBe("Second line note");
  });

  it("matches lines that share the same trimmed text (whitespace-insensitive)", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "  Hello  ", comment: "Padded note" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Hello", comment: "Plain note" }),
    };
    const index = buildCommentIndex(lyrics);
    expect(index.size).toBe(1);
    expect(index.get("Hello")).toBe("Padded note");
  });

  it("excludes blank and whitespace-only lyric text entirely", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "", comment: "Ignored empty" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "   ", comment: "Ignored blank" }),
      lrc_02: makeLine({ time_start: 3000, lyric: "Real line", comment: "Kept" }),
    };
    const index = buildCommentIndex(lyrics);
    expect(index.size).toBe(1);
    expect(index.get("Real line")).toBe("Kept");
  });

  it("first non-empty comment wins when lines share text", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Chorus", comment: "First" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Chorus", comment: "Second" }),
      lrc_02: makeLine({ time_start: 3000, lyric: "Chorus", comment: "Third" }),
    };
    const index = buildCommentIndex(lyrics);
    expect(index.get("Chorus")).toBe("First");
  });

  it("treats undefined, null and whitespace-only comments as absent", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "A", comment: undefined }),
      lrc_01: makeLine({ time_start: 1500, lyric: "B", comment: "   " }),
      lrc_02: makeLine({ time_start: 3000, lyric: "C", comment: "" }),
    };
    const index = buildCommentIndex(lyrics);
    expect(index.size).toBe(0);
  });

  it("returns an empty map for an empty lyrics record", () => {
    expect(buildCommentIndex({}).size).toBe(0);
  });
});

describe("getCommentForLine", () => {
  it("trims the input before looking up", () => {
    const index = new Map<string, string>([["Hello", "A note"]]);
    expect(getCommentForLine(index, "  Hello  ")).toBe("A note");
  });

  it("returns undefined for empty or whitespace-only input", () => {
    const index = new Map<string, string>([["Hello", "A note"]]);
    expect(getCommentForLine(index, "")).toBeUndefined();
    expect(getCommentForLine(index, "   ")).toBeUndefined();
  });

  it("returns undefined when the text has no comment", () => {
    const index = new Map<string, string>();
    expect(getCommentForLine(index, "Hello")).toBeUndefined();
  });
});

describe("applyCommentToMatchingLines", () => {
  it("applies the comment to every line sharing the trimmed text", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Chorus" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Chorus" }),
      lrc_02: makeLine({ time_start: 3000, lyric: "Bridge" }),
    };
    const updated = applyCommentToMatchingLines(lyrics, "Chorus", "Big note");
    expect(updated.lrc_00!.comment).toBe("Big note");
    expect(updated.lrc_01!.comment).toBe("Big note");
  });

  it("leaves non-matching lines unchanged by reference", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Chorus", comment: "Old" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Bridge" }),
    };
    const updated = applyCommentToMatchingLines(lyrics, "Chorus", "New");
    expect(updated.lrc_00!.comment).toBe("New");
    expect(updated.lrc_01).toBe(lyrics.lrc_01);
  });

  it("clears the field when the comment is blank", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Chorus", comment: "Old" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Bridge", comment: "Keep" }),
    };
    const updated = applyCommentToMatchingLines(lyrics, "Chorus", "   ");
    expect(updated.lrc_00!.comment).toBeUndefined();
    expect(updated.lrc_01!.comment).toBe("Keep");
  });

  it("does not mutate the input object", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Chorus", comment: "Old" }),
    };
    applyCommentToMatchingLines(lyrics, "Chorus", "New");
    expect(lyrics.lrc_00!.comment).toBe("Old");
  });

  it("matches whitespace-insensitively", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "  Chorus  " }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Chorus" }),
    };
    const updated = applyCommentToMatchingLines(lyrics, " Chorus ", "Note");
    expect(updated.lrc_00!.comment).toBe("Note");
    expect(updated.lrc_01!.comment).toBe("Note");
  });
});

describe("buildCommentList", () => {
  it("returns an empty list for an empty lyrics record", () => {
    expect(buildCommentList({})).toEqual([]);
  });

  it("returns one entry per distinct commented line with correct line numbers", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Hello", comment: "First line note" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "World", comment: "Second line note" }),
    };
    const list = buildCommentList(lyrics);
    expect(list).toEqual([
      { key: "lrc_00", lyric: "Hello", comment: "First line note", lineNumbers: [1] },
      { key: "lrc_01", lyric: "World", comment: "Second line note", lineNumbers: [2] },
    ]);
  });

  it("collapses repeated original text into a single entry collecting all line numbers", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Chorus", comment: "First" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Chorus", comment: "Second" }),
      lrc_02: makeLine({ time_start: 3000, lyric: "Bridge", comment: "Bridge note" }),
    };
    const list = buildCommentList(lyrics);
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({
      key: "lrc_00",
      lyric: "Chorus",
      comment: "First",
      lineNumbers: [1, 2],
    });
  });

  it("excludes blank and whitespace-only lyric lines entirely", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "", comment: "Ignored empty" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "   ", comment: "Ignored blank" }),
      lrc_02: makeLine({ time_start: 3000, lyric: "Real line", comment: "Kept" }),
    };
    const list = buildCommentList(lyrics);
    expect(list).toEqual([
      { key: "lrc_02", lyric: "Real line", comment: "Kept", lineNumbers: [3] },
    ]);
  });

  it("does not create a spurious entry for uncommented lines and first non-empty comment wins", () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: makeLine({ lyric: "Chorus" }),
      lrc_01: makeLine({ time_start: 1500, lyric: "Chorus", comment: "First real note" }),
      lrc_02: makeLine({ time_start: 3000, lyric: "Chorus", comment: "Second note" }),
      lrc_03: makeLine({ time_start: 4500, lyric: "Chorus" }),
    };
    const list = buildCommentList(lyrics);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      key: "lrc_00",
      lyric: "Chorus",
      comment: "First real note",
      lineNumbers: [1, 2, 3, 4],
    });
  });
});
