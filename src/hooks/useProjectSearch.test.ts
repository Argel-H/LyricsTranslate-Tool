import { describe, it, expect } from "vitest";
import { formatSearchResults } from "./useProjectSearch";
import type { LRCLibResult } from "@/types/music";

function makeResult(
  overrides: Partial<LRCLibResult> & Pick<LRCLibResult, "id">,
): LRCLibResult {
  return {
    trackName: "Track",
    artistName: "Artist",
    plainLyrics: "",
    syncedLyrics: null,
    instrumental: false,
    lang: "en",
    isrc: null,
    spotifyId: null,
    ...overrides,
  };
}

describe("formatSearchResults", () => {
  it("returns undefined when results are undefined", () => {
    expect(formatSearchResults(undefined)).toBeUndefined();
  });

  it("returns an empty array for an empty result set", () => {
    expect(formatSearchResults([])).toEqual([]);
  });

  it("maps id, track, artist and album", () => {
    const [formatted] = formatSearchResults([
      makeResult({ id: 7, trackName: "Song", artistName: "Band", albumName: "LP" }),
    ])!;
    expect(formatted).toEqual({
      id: 7,
      trackName: "Song",
      artistName: "Band",
      albumName: "LP",
      isSynced: false,
    });
  });

  it("sets isSynced true when syncedLyrics is non-null", () => {
    const formatted = formatSearchResults([
      makeResult({ id: 1, syncedLyrics: "[00:00.00] hi" }),
      makeResult({ id: 2, syncedLyrics: null }),
    ])!;
    expect(formatted.find((r) => r.id === 1)?.isSynced).toBe(true);
    expect(formatted.find((r) => r.id === 2)?.isSynced).toBe(false);
  });

  it("sorts synced results before unsynced results", () => {
    const formatted = formatSearchResults([
      makeResult({ id: 1, syncedLyrics: null }),
      makeResult({ id: 2, syncedLyrics: "[00:00.00] hi" }),
      makeResult({ id: 3, syncedLyrics: null }),
      makeResult({ id: 4, syncedLyrics: "[00:00.00] ho" }),
    ])!;
    expect(formatted.map((r) => r.id)).toEqual([2, 4, 1, 3]);
  });

  it("keeps the original relative order among ties", () => {
    const formatted = formatSearchResults([
      makeResult({ id: 10 }),
      makeResult({ id: 11 }),
      makeResult({ id: 12 }),
    ])!;
    expect(formatted.map((r) => r.id)).toEqual([10, 11, 12]);
  });

  it("leaves albumName undefined when absent", () => {
    const [formatted] = formatSearchResults([makeResult({ id: 1 })])!;
    expect(formatted.albumName).toBeUndefined();
  });
});
