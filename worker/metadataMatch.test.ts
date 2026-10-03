import { describe, it, expect } from "vitest";
import {
  normalizeForMatch,
  pickBestDeezerTrack,
  pickBestRecording,
} from "./index.js";

describe("normalizeForMatch", () => {
  it("strips accents, punctuation and casing", () => {
    expect(normalizeForMatch("Beyoncé — Halo!")).toBe("beyonce halo");
  });

  it("handles null and undefined input", () => {
    expect(normalizeForMatch(null)).toBe("");
    expect(normalizeForMatch(undefined)).toBe("");
  });

  it("preserves non-Latin scripts", () => {
    expect(normalizeForMatch("こんにちは")).toBe("こんにちは");
    expect(normalizeForMatch("Привет мир")).toBe("привет мир");
    expect(normalizeForMatch("مرحبا بالعالم")).toBe("مرحبا بالعالم");
  });
});

describe("pickBestDeezerTrack", () => {
  const tracks = [
    { id: 1, title: "collapse", artist: { name: "Amotti" } },
    { id: 2, title: "Collares calle 8", artist: { name: "Amenti" } },
  ];

  it("matches the requested artist", () => {
    expect(pickBestDeezerTrack(tracks, ["Amotti"], "collapse")?.id).toBe(1);
  });

  it("falls back to an exact title match when no artists are provided", () => {
    expect(pickBestDeezerTrack(tracks, [], "collapse")?.id).toBe(1);
  });

  it("rejects a track by a different artist", () => {
    expect(pickBestDeezerTrack(tracks, ["Someone Else"], "collapse")).toBeNull();
  });

  it("matches a non-Latin track", () => {
    const nonLatin = [{ id: 5, title: "こんにちは", artist: { name: "米津玄師" } }];
    expect(pickBestDeezerTrack(nonLatin, ["米津玄師"], "こんにちは")?.id).toBe(5);
  });
});

describe("pickBestRecording", () => {
  const matching = {
    title: "collapse",
    "artist-credit": [{ name: "Amotti", artist: { id: "x" } }],
  };
  const unrelated = {
    title: "Something Else",
    "artist-credit": [{ name: "Other", artist: { id: "y" } }],
  };

  it("matches the requested artist", () => {
    expect(pickBestRecording([matching, unrelated], ["Amotti"], "collapse")).toBe(matching);
  });

  it("rejects a recording by a different artist", () => {
    expect(pickBestRecording([matching, unrelated], ["Someone Else"], "collapse")).toBeNull();
  });

  it("matches a non-Latin recording", () => {
    const nonLatin = {
      title: "こんにちは",
      "artist-credit": [{ name: "米津玄師", artist: { id: "x" } }],
    };
    expect(pickBestRecording([nonLatin], ["米津玄師"], "こんにちは")).toBe(nonLatin);
  });
});
