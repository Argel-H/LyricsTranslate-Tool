import { describe, it, expect } from "vitest";
import { pickBestLrcResult } from "./lrclib";
import type { LRCLibResult } from "@/types/music";

function makeResult(overrides: Partial<LRCLibResult>): LRCLibResult {
  return {
    id: 1,
    trackName: "Track",
    artistName: "Artist",
    plainLyrics: "",
    syncedLyrics: null,
    instrumental: false,
    lang: "",
    isrc: null,
    spotifyId: null,
    ...overrides,
  };
}

describe("pickBestLrcResult", () => {
  it("prefers an exact title match over a synced non-match", () => {
    const results = [
      makeResult({ id: 1, trackName: "555", syncedLyrics: "[00:00.00] lyrics" }),
      makeResult({ id: 2, trackName: "hiraeth", syncedLyrics: null }),
    ];
    expect(pickBestLrcResult(results, "hiraeth")?.id).toBe(2);
  });

  it("prefers synced among equally-close matches", () => {
    const results = [
      makeResult({ id: 1, trackName: "hiraeth", syncedLyrics: null }),
      makeResult({ id: 2, trackName: "hiraeth", syncedLyrics: "[00:00.00] lyrics" }),
    ];
    expect(pickBestLrcResult(results, "hiraeth")?.id).toBe(2);
  });

  it("handles a query that contains the track name (partial match)", () => {
    const results = [
      makeResult({ id: 1, trackName: "555", syncedLyrics: "[00:00.00] lyrics" }),
      makeResult({ id: 2, trackName: "hiraeth", syncedLyrics: null }),
    ];
    expect(pickBestLrcResult(results, "sub urban hiraeth")?.id).toBe(2);
  });

  it("returns undefined for empty results", () => {
    expect(pickBestLrcResult([], "hiraeth")).toBeUndefined();
  });
});
