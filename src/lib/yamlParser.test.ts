import { describe, it, expect } from "vitest";
import { parseProjectYaml } from "./yamlParser";

const VALID_YAML = `version: 1

project:
  title: "Test Song"
  track_name: "Test Track"
  artists:
    - "Artist One"
    - "Artist Two"
  album_name: "Test Album"
  cover_url: "https://example.com/cover.jpg"
  isrcs: "USABC1234567"
  origin_language: "en"
  translation_language: "es"
  song_link: "https://open.spotify.com/track/abc123"
  audio_url: "https://example.com/audio.mp3"
  sync_offset_ms: 0
  artist_links:
    - name: "Artist One"
      url: "https://open.spotify.com/artist/abc"
    - name: "Artist Two"
      url: "https://open.spotify.com/artist/def"
  social_links:
    - artist_name: "Artist One"
      platforms:
        - platform: "Twitter"
          url: "https://twitter.com/artist"
    - platforms:
        - platform: "Instagram"
          url: "https://instagram.com/artist"
  streaming_sites:
    spotify: "https://open.spotify.com/track/abc123"
    deezer: null

metadata:
  created_at: 1710000000
  updated_at: 1710003600
  exported_at: 1710007200

lyrics:
  - time_start: "00:01.00"
    time_end: "00:05.00"
    original: "Hello world"
    translated: "Hola mundo"
    locked: false
  - time_start: "00:06.00"
    time_end: "00:10.00"
    original: "How are you"
    translated: "Cómo estás"
`;

const MINIMAL_YAML = `version: 1

project:
  title: "Minimal"
  track_name: "Minimal Track"
  artists:
    - "Only Artist"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;

describe("parseProjectYaml", () => {
  it("parses full valid YAML into ProjectCreateInput", () => {
    const result = parseProjectYaml(VALID_YAML);
    expect(result.trackName).toBe("Test Track");
    expect(result.artistName).toEqual(["Artist One", "Artist Two"]);
    expect(result.albumName).toBe("Test Album");
    expect(result.coverUrl).toBe("https://example.com/cover.jpg");
    expect(result.isrcs).toBe("USABC1234567");
    expect(result.originLanguage).toBe("en");
    expect(result.translationLanguage).toBe("es");
    expect(result.songLinkUrl).toBe("https://open.spotify.com/track/abc123");
    expect(result.audioUrl).toBe("https://example.com/audio.mp3");
    expect(result.syncOffsetMs).toBe(0);
    expect(result.streamingSites?.spotify).toBe("https://open.spotify.com/track/abc123");
    expect(result.streamingSites?.deezer).toBeNull();
  });

  it("parses lyrics with keys, locked states (true/false/default), and correct fields", () => {
    const result = parseProjectYaml(VALID_YAML);
    const lyrics = result.lyrics;
    expect(Object.keys(lyrics)).toEqual(["lrc_00", "lrc_01"]);
    expect(lyrics.lrc_00?.lyric).toBe("Hello world");
    expect(lyrics.lrc_00?.translation).toBe("Hola mundo");
    expect(lyrics.lrc_00?.time_start).toBe(1000);
    expect(lyrics.lrc_00?.time_end).toBe(5000);
    expect(lyrics.lrc_00?.locked).toBe(false);
    expect(lyrics.lrc_01?.lyric).toBe("How are you");
    expect(lyrics.lrc_01?.translation).toBe("Cómo estás");

    const lockedResult = parseProjectYaml("version: 1\nproject:\n  title: \"T\"\n  track_name: \"T\"\n  artists:\n    - \"A\"\nmetadata:\n  created_at: 0\n  updated_at: 0\n  exported_at: 0\nlyrics:\n  - time_start: \"00:00.00\"\n    time_end: \"00:01.00\"\n    original: \"Locked\"\n    translated: \"Bloqueado\"\n    locked: true\n  - time_start: \"00:01.00\"\n    time_end: \"00:02.00\"\n    original: \"Unlocked\"\n    translated: \"Desbloqueado\"\n");
    expect(lockedResult.lyrics.lrc_00?.locked).toBe(true);
    expect(lockedResult.lyrics.lrc_01?.locked).toBe(false);
  });

  it("accepts minimal YAML with only required fields", () => {
    const result = parseProjectYaml(MINIMAL_YAML);
    expect(result.trackName).toBe("Minimal Track");
    expect(result.artistName).toEqual(["Only Artist"]);
    expect(result.lyrics).toEqual({});
    expect(result.albumName).toBeUndefined();
    expect(result.coverUrl).toBeUndefined();
    expect(result.syncOffsetMs).toBeUndefined();
  });

  it("throws when version missing or not a number", () => {
    expect(() => parseProjectYaml("project:\n  title: \"T\"\n  track_name: \"T\"\n  artists:\n    - \"A\"\nmetadata:\n  created_at: 0\n  updated_at: 0\n  exported_at: 0\nlyrics: []\n")).toThrow("Missing required field: version");
    expect(() => parseProjectYaml("version: \"one\"\nproject:\n  title: \"T\"\n  track_name: \"T\"\n  artists:\n    - \"A\"\nmetadata:\n  created_at: 0\n  updated_at: 0\n  exported_at: 0\nlyrics: []\n")).toThrow("Invalid version");
  });

  it("throws when track_name missing or empty", () => {
    expect(() => parseProjectYaml("version: 1\nproject:\n  title: \"T\"\n  artists:\n    - \"A\"\nmetadata:\n  created_at: 0\n  updated_at: 0\n  exported_at: 0\nlyrics: []\n")).toThrow("project.track_name");
    expect(() => parseProjectYaml("version: 1\nproject:\n  title: \"T\"\n  track_name: \"\"\n  artists:\n    - \"A\"\nmetadata:\n  created_at: 0\n  updated_at: 0\n  exported_at: 0\nlyrics: []\n")).toThrow("project.track_name");
  });

  it("throws when project section or lyrics is missing", () => {
    expect(() => parseProjectYaml("version: 1\nmetadata:\n  created_at: 0\n  updated_at: 0\n  exported_at: 0\nlyrics: []\n")).toThrow("project");
    expect(() => parseProjectYaml("version: 1\nproject:\n  title: \"T\"\n  track_name: \"T\"\n  artists:\n    - \"A\"\nmetadata:\n  created_at: 0\n  updated_at: 0\n  exported_at: 0\n")).toThrow("lyrics must be an array");
  });


});
