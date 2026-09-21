import { describe, it, expect } from "vitest";
import { buildProjectInput } from "./useProjectSetupForm";
import type {
  DiscoveredMeta,
  ProjectFormState,
} from "./useProjectSetupForm";
import { toLyricLineMap } from "@/lib/lyricsParser";
import type { ValidationResult } from "@/lib/lyricsUploadValidator";

function makeState(overrides: Partial<ProjectFormState> = {}): ProjectFormState {
  return {
    songName: "  My Song  ",
    artists: ["Artist A"],
    coverUrl: "",
    originLanguage: "English",
    translationLanguage: "Spanish",
    albumName: "",
    songLinkUrl: "",
    wallpaperArtistName: "",
    wallpaperSource: "",
    wallpaperUrl: "",
    lyricsValidation: null,
    socialEntries: [],
    ...overrides,
  };
}

const VALID_LRC: ValidationResult = {
  valid: true,
  format: "lrc",
  lines: [
    { timestamp: "00:01.00", text: "Hello" },
    { timestamp: "00:03.50", text: "World" },
  ],
  lineCount: 2,
  isSynced: true,
};

const INVALID_LRC: ValidationResult = {
  valid: false,
  format: "unknown",
  error: "No lyrics content provided",
  lineCount: 0,
  isSynced: false,
};

describe("buildProjectInput", () => {
  it("trims the track name", () => {
    expect(buildProjectInput(makeState(), {}).trackName).toBe("My Song");
  });

  it("filters artists down to non-blank entries", () => {
    const input = buildProjectInput(
      makeState({ artists: ["Artist A", "   ", "", "Artist B"] }),
      {},
    );
    expect(input.artistName).toEqual(["Artist A", "Artist B"]);
  });

  it("collapses blank optional text fields to undefined", () => {
    const input = buildProjectInput(
      makeState({
        coverUrl: "   ",
        albumName: "  ",
        songLinkUrl: "",
        wallpaperArtistName: "\t",
        wallpaperSource: "",
        wallpaperUrl: "   ",
      }),
      {},
    );

    expect(input.coverUrl).toBeUndefined();
    expect(input.albumName).toBeUndefined();
    expect(input.songLinkUrl).toBeUndefined();
    expect(input.wallpaperArtistName).toBeUndefined();
    expect(input.wallpaperSource).toBeUndefined();
    expect(input.wallpaperUrl).toBeUndefined();
  });

  it("keeps trimmed optional text fields when present", () => {
    const input = buildProjectInput(
      makeState({
        coverUrl: "  https://cover  ",
        albumName: "  Album  ",
        songLinkUrl: "  https://song  ",
        wallpaperArtistName: "  Wallpaper Artist  ",
        wallpaperSource: "  ArtStation  ",
        wallpaperUrl: "  https://wall  ",
      }),
      {},
    );

    expect(input.coverUrl).toBe("https://cover");
    expect(input.albumName).toBe("Album");
    expect(input.songLinkUrl).toBe("https://song");
    expect(input.wallpaperArtistName).toBe("Wallpaper Artist");
    expect(input.wallpaperSource).toBe("ArtStation");
    expect(input.wallpaperUrl).toBe("https://wall");
  });

  it("preserves the selected languages verbatim", () => {
    const input = buildProjectInput(
      makeState({ originLanguage: "Japanese", translationLanguage: "English" }),
      {},
    );
    expect(input.originLanguage).toBe("Japanese");
    expect(input.translationLanguage).toBe("English");
  });

  it("omits recommendedSocialLinks when there are no entries", () => {
    expect(
      buildProjectInput(makeState({ socialEntries: [] }), {}).recommendedSocialLinks,
    ).toBeUndefined();
  });

  it("maps recommendedSocialLinks platform/url/artistName through artistIndex", () => {
    const input = buildProjectInput(
      makeState({
        artists: ["Artist A", "Artist B", "  "],
        socialEntries: [
          { artistIndex: 1, platform: "Spotify", url: "https://spotify" },
          { artistIndex: 0, platform: "YouTube", url: "https://youtube" },
        ],
      }),
      {},
    );

    expect(input.recommendedSocialLinks).toEqual([
      { platform: "Spotify", url: "https://spotify", artistName: "Artist B" },
      { platform: "YouTube", url: "https://youtube", artistName: "Artist A" },
    ]);
  });

  it("maps valid parsed lyrics through toLyricLineMap", () => {
    const input = buildProjectInput(
      makeState({ lyricsValidation: VALID_LRC }),
      {},
    );

    expect(input.lyrics).toEqual(
      Object.fromEntries(toLyricLineMap(VALID_LRC.lines!)),
    );
    expect(input.lyrics).toEqual({
      lrc_00: { time_start: 1000, time_end: 3500, lyric: "Hello", translation: "" },
      lrc_01: { time_start: 3500, time_end: 6500, lyric: "World", translation: "" },
    });
  });

  it("returns empty lyrics when validation is invalid", () => {
    const input = buildProjectInput(
      makeState({ lyricsValidation: INVALID_LRC }),
      {},
    );
    expect(input.lyrics).toEqual({});
  });

  it("returns empty lyrics when validation is null or has no lines", () => {
    expect(
      buildProjectInput(makeState({ lyricsValidation: null }), {}).lyrics,
    ).toEqual({});

    expect(
      buildProjectInput(
        makeState({ lyricsValidation: { ...VALID_LRC, lines: undefined } }),
        {},
      ).lyrics,
    ).toEqual({});
  });

  it("forwards discovered metadata verbatim", () => {
    const discovered: DiscoveredMeta = {
      isrcs: "US1234567890",
      streamingSites: { spotify: "https://open.spotify.com/x", deezer: null },
      artistLinks: [{ name: "Artist A", url: "https://deezer.com/a" }],
    };

    const input = buildProjectInput(makeState(), discovered);

    expect(input.isrcs).toBe("US1234567890");
    expect(input.streamingSites).toEqual(discovered.streamingSites);
    expect(input.artistLinks).toEqual(discovered.artistLinks);
  });
});
