import { describe, it, expect } from "vitest";
import { findExistingTranslation, findAllTranslations } from "@/lib/suggestionUtils";
import { processLyricsMap } from "@/lib/lyricsParser";
import { MOCK_LRC_RAW } from "@/test/mocks/voilaBallerina";
import type { LyricLine } from "@/types/project";

function mapToRecord(map: Map<string, LyricLine>): Record<string, LyricLine> {
  const record: Record<string, LyricLine> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

describe("findExistingTranslation", () => {
  const lyricsMap = processLyricsMap(MOCK_LRC_RAW!)!;
  const lyrics = mapToRecord(lyricsMap);

  it("finds translation when another occurrence has one", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";
    const [secondKey] = ballerinaEntries[1]!;
    const result = findExistingTranslation("Ballerina dressed in black", secondKey, lyrics);
    expect(result).not.toBeNull();
    expect(result!.text).toBe("Bailarina vestida de negro");
  });

  it("skips own key", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [firstKey, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";
    const result = findExistingTranslation("Ballerina dressed in black", firstKey, lyrics);
    expect(result).toBeNull();
  });

  it("is case-insensitive and whitespace-insensitive", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [, firstLine] = ballerinaEntries[0]!;
    firstLine.translation = "Bailarina vestida de negro";
    const [secondKey] = ballerinaEntries[1]!;
    expect(findExistingTranslation("ballerina dressed in black", secondKey, lyrics)!.text).toBe("Bailarina vestida de negro");
    expect(findExistingTranslation("  Ballerina dressed in black  ", secondKey, lyrics)!.text).toBe("Bailarina vestida de negro");
  });
});

describe("findAllTranslations", () => {
  const lyricsMap = processLyricsMap(MOCK_LRC_RAW!)!;
  const lyrics = mapToRecord(lyricsMap);

  it("returns multiple unique suggestions sorted by appearance", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [, firstLine] = ballerinaEntries[0]!;
    const [, secondLine] = ballerinaEntries[1]!;
    firstLine.translation = "Bailarina vestida de negro";
    secondLine.translation = "Bailarina de luto";
    const thirdKey = ballerinaEntries[2]![0];
    const result = findAllTranslations("Ballerina dressed in black", thirdKey, lyrics);
    expect(result).toHaveLength(2);
    expect(result[0]!.text).toBe("Bailarina vestida de negro");
    expect(result[1]!.text).toBe("Bailarina de luto");
  });

  it("deduplicates identical translations and skips own key", () => {
    const ballerinaEntries = Object.entries(lyrics).filter(
      ([, line]) => line.lyric === "Ballerina dressed in black",
    );
    const [, firstLine] = ballerinaEntries[0]!;
    const [, secondLine] = ballerinaEntries[1]!;
    firstLine.translation = "Bailarina vestida de negro";
    secondLine.translation = "Bailarina vestida de negro";
    const thirdKey = ballerinaEntries[2]![0];
    const result = findAllTranslations("Ballerina dressed in black", thirdKey, lyrics);
    expect(result).toHaveLength(1);

    firstLine.translation = "Bailarina A";
    secondLine.translation = "Bailarina B";
    const [firstKey] = ballerinaEntries[0]!;
    const result2 = findAllTranslations("Ballerina dressed in black", firstKey, lyrics);
    expect(result2).toHaveLength(1);
    expect(result2[0]!.text).toBe("Bailarina B");
  });
});
