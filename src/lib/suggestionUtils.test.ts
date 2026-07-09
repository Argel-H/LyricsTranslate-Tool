import { describe, it, expect } from "vitest";
import { findExistingTranslation, findAllTranslations } from "@/lib/suggestionUtils";
import { processLyricsMap } from "@/lib/lyricsParser";
import { MOCK_LRC_RAW } from "@/test/mocks/voilaBallerina";
import type { LyricLine } from "@/types/project";

/**
 * Converts a Map<string, LyricLine> to a Record<string, LyricLine>.
 * This is needed because `processLyricsMap` returns a Map, but 
 * `findExistingTranslation` expects a Record (plain object).
 */
function mapToRecord(map: Map<string, LyricLine>): Record<string, LyricLine> {
  const record: Record<string, LyricLine> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

describe("findExistingTranslation", () => {
  /**
   * Build lyrics from the Ballerina mock LRC data.
   * The song has "Ballerina dressed in black" at lines 28, 46, 64
   * and "I'm sorry, what's your excuse?" at multiple lines.
   */
  const lyricsMap = processLyricsMap(MOCK_LRC_RAW)!;
  const lyrics = mapToRecord(lyricsMap);

  it("returns null when no lines have translations", () => {
    // Find the key for "Ballerina dressed in black"
    const entry = Object.entries(lyrics).find(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    expect(entry).toBeDefined();
    const [key] = entry!;
    
    const result = findExistingTranslation("Ballerina dressed in black", key, lyrics);
    expect(result).toBeNull();
  });

  it("finds translation when another occurrence has one", () => {
    // Find all keys for "Ballerina dressed in black"
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    expect(ballerinaEntries.length).toBeGreaterThanOrEqual(3);

    // Translate the first occurrence
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";

    // Check that the second occurrence gets a suggestion
    const [secondKey] = ballerinaEntries[1]!;
    const result = findExistingTranslation("Ballerina dressed in black", secondKey, lyrics);
    expect(result).not.toBeNull();
    expect(result!.text).toBe("Bailarina vestida de negro");
    expect(result!.sourceLineNumber).toBeGreaterThan(0);
  });

  it("returns null for the translated line itself (skips own key)", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";

    // The translated line should not get a suggestion (it already has one)
    const result = findExistingTranslation("Ballerina dressed in black", firstKey, lyrics);
    expect(result).toBeNull();
  });

  it("is case-insensitive", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";

    const [secondKey] = ballerinaEntries[1]!;
    // Search with different casing
    const result = findExistingTranslation("ballerina dressed in black", secondKey, lyrics);
    expect(result).not.toBeNull();
    expect(result!.text).toBe("Bailarina vestida de negro");
  });

  it("is whitespace-insensitive (trimmed comparison)", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";

    const [secondKey] = ballerinaEntries[1]!;
    // Search with surrounding whitespace
    const result = findExistingTranslation("  Ballerina dressed in black  ", secondKey, lyrics);
    expect(result).not.toBeNull();
    expect(result!.text).toBe("Bailarina vestida de negro");
  });

  it("returns null for empty lyric input", () => {
    const lyrics2: Record<string, LyricLine> = {
      "lrc_00": { time_start: "00:00.00", time_end: "00:03.00", lyric: "Hello", translation: "Hola", comment: "" },
    };
    const result = findExistingTranslation("   ", "lrc_01", lyrics2);
    expect(result).toBeNull();
  });

  it("returns null when no matching lyric exists", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";

    // Search for a lyric that doesn't exist
    const result = findExistingTranslation("This lyric does not exist", "lrc_99", lyrics);
    expect(result).toBeNull();
  });

  it("handles multiple matching lyrics and returns first with translation", () => {
    // The song has multiple choruses. Find "I'm sorry, what's your excuse?"
    const sorryEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "I'm sorry, what's your excuse?",
    );
    expect(sorryEntries.length).toBeGreaterThanOrEqual(2);

    // Translate the LAST occurrence (not the first)
    const [lastKey, lastLine] = sorryEntries[sorryEntries.length - 1]!;
    lastLine.translation = "Lo siento, ¿cuál es tu excusa?";

    // Check that the FIRST occurrence gets the suggestion
    const [firstKey] = sorryEntries[0]!;
    const result = findExistingTranslation("I'm sorry, what's your excuse?", firstKey, lyrics);
    expect(result).not.toBeNull();
    expect(result!.text).toBe("Lo siento, ¿cuál es tu excusa?");
  });
});

describe("findAllTranslations", () => {
  const lyricsMap = processLyricsMap(MOCK_LRC_RAW)!;
  const lyrics = mapToRecord(lyricsMap);

  it("returns empty array when no lines have translations", () => {
    const entry = Object.entries(lyrics).find(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    expect(entry).toBeDefined();
    const [key] = entry!;
    const result = findAllTranslations("Ballerina dressed in black", key, lyrics);
    expect(result).toEqual([]);
  });

  it("returns one suggestion when only one occurrence is translated", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";

    const [secondKey] = ballerinaEntries[1]!;
    const result = findAllTranslations("Ballerina dressed in black", secondKey, lyrics);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Bailarina vestida de negro");
    expect(result[0]!.sourceLineNumber).toBeGreaterThan(0);
  });

  it("returns multiple unique suggestions when different translations exist", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [, firstLine] = ballerinaEntries[0]!;
    const [, secondLine] = ballerinaEntries[1]!;
    firstLine.translation = "Bailarina vestida de negro";
    secondLine.translation = "Bailarina de luto";

    const [,, thirdEntry] = ballerinaEntries;
    const thirdKey = thirdEntry ? thirdEntry[0] : ballerinaEntries[2]![0];
    const result = findAllTranslations("Ballerina dressed in black", thirdKey, lyrics);
    expect(result).toHaveLength(2);
    const texts = result.map((s) => s.text);
    expect(texts).toContain("Bailarina vestida de negro");
    expect(texts).toContain("Bailarina de luto");
    // Should be sorted by appearance order (first occurrence's translation first)
    expect(result[0]!.text).toBe("Bailarina vestida de negro");
  });

  it("deduplicates identical translations from different lines", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [, firstLine] = ballerinaEntries[0]!;
    const [, secondLine] = ballerinaEntries[1]!;
    firstLine.translation = "Bailarina vestida de negro";
    secondLine.translation = "Bailarina vestida de negro"; // same text

    const thirdKey = ballerinaEntries[2]![0];
    const result = findAllTranslations("Ballerina dressed in black", thirdKey, lyrics);
    expect(result).toHaveLength(1);
  });

  it("skips own key even if translated", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    const [, secondLine] = ballerinaEntries[1]!;
    firstLine.translation = "Bailarina A";
    secondLine.translation = "Bailarina B";

    const result = findAllTranslations("Ballerina dressed in black", firstKey, lyrics);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Bailarina B");
  });

  it("returns empty array for empty lyric input", () => {
    const lyrics2: Record<string, LyricLine> = {
      lrc_00: { time_start: "00:00.00", time_end: "00:03.00", lyric: "Hello", translation: "Hola", comment: "" },
    };
    const result = findAllTranslations("   ", "lrc_01", lyrics2);
    expect(result).toEqual([]);
  });

  it("handles chorus with multiple different translations", () => {
    const sorryEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "I'm sorry, what's your excuse?",
    );
    expect(sorryEntries.length).toBeGreaterThanOrEqual(2);

    const [firstKey, firstLine] = sorryEntries[0]!;
    const [, lastLine] = sorryEntries[sorryEntries.length - 1]!;
    firstLine.translation = "Perdona, ¿cuál es tu excusa?";
    lastLine.translation = "Lo siento, ¿cuál es tu excusa?";

    // Check from a third occurrence (if exists) or from the second
    const checkKey = sorryEntries.length > 2
      ? sorryEntries[2]![0]
      : sorryEntries[1]![0];
    const result = findAllTranslations("I'm sorry, what's your excuse?", checkKey, lyrics);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
