import { describe, it, expect, vi, afterEach } from "vitest";
import axios from "axios";
import { pickBestLrcResult, searchLrcLib } from "./lrclib";
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

describe("searchLrcLib", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the search results", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: [{ trackName: "Song" }],
    } as unknown as never);

    const results = await searchLrcLib("song");
    expect(results).toEqual([{ trackName: "Song" }]);
  });

  it("filters out results with junk video markers in the track name", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: [{ trackName: "Song" }, { trackName: "Song (Lyric Video)" }],
    } as unknown as never);

    const results = await searchLrcLib("song");
    expect(results).toEqual([{ trackName: "Song" }]);
  });

  it("rejects when the request fails instead of returning an empty array", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(new Error("network error"));

    await expect(searchLrcLib("song")).rejects.toThrow("network error");
  });
});
