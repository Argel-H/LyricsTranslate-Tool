import { describe, it, expect } from "vitest";
import { parseProjectYaml } from "./yamlParser";

// ---------------------------------------------------------------------------
// Valid sample YAML (full export)
// ---------------------------------------------------------------------------
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
    - platform: "Twitter"
      url: "https://twitter.com/artist"
      artist_name: "Artist One"
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

// ---------------------------------------------------------------------------
// Minimal valid YAML (only required fields)
// ---------------------------------------------------------------------------
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
  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------
  it("parses a full valid YAML and returns ProjectCreateInput", () => {
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
  });

  it("parses lyrics as a Record<string, LyricLine> with correct keys", () => {
    const result = parseProjectYaml(VALID_YAML);
    const lyrics = result.lyrics;

    expect(Object.keys(lyrics)).toEqual(["lrc_00", "lrc_01"]);
    expect(lyrics.lrc_00?.lyric).toBe("Hello world");
    expect(lyrics.lrc_00?.translation).toBe("Hola mundo");
    expect(lyrics.lrc_00?.time_start).toBe(1000);
    expect(lyrics.lrc_00?.time_end).toBe(5000);
    expect((lyrics.lrc_00 as unknown as Record<string, unknown>)?.comment).toBeUndefined();
    expect(lyrics.lrc_00?.locked).toBe(false);

    expect(lyrics.lrc_01?.lyric).toBe("How are you");
    expect(lyrics.lrc_01?.translation).toBe("Cómo estás");
    expect(lyrics.lrc_01?.time_start).toBe(6000);
    expect(lyrics.lrc_01?.time_end).toBe(10000);
  });

  it("parses artist_links into artistLinks", () => {
    const result = parseProjectYaml(VALID_YAML);
    expect(result.artistLinks).toHaveLength(2);
    expect(result.artistLinks?.[0]?.name).toBe("Artist One");
    expect(result.artistLinks?.[0]?.url).toBe(
      "https://open.spotify.com/artist/abc",
    );
    expect(result.artistLinks?.[1]?.name).toBe("Artist Two");
  });

  it("parses social_links into recommendedSocialLinks with artistName mapping", () => {
    const result = parseProjectYaml(VALID_YAML);
    expect(result.recommendedSocialLinks).toHaveLength(2);
    expect(result.recommendedSocialLinks?.[0]?.platform).toBe("Twitter");
    expect(result.recommendedSocialLinks?.[0]?.artistName).toBe("Artist One");
    expect(result.recommendedSocialLinks?.[1]?.platform).toBe("Instagram");
    expect(result.recommendedSocialLinks?.[1]?.artistName).toBeUndefined();
  });

  it("parses streaming_sites into streamingSites (including null values)", () => {
    const result = parseProjectYaml(VALID_YAML);
    expect(result.streamingSites).toBeDefined();
    expect(result.streamingSites?.spotify).toBe(
      "https://open.spotify.com/track/abc123",
    );
    expect(result.streamingSites?.deezer).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Minimal input
  // -----------------------------------------------------------------------
  it("accepts minimal YAML with only required fields and empty lyrics", () => {
    const result = parseProjectYaml(MINIMAL_YAML);
    expect(result.trackName).toBe("Minimal Track");
    expect(result.artistName).toEqual(["Only Artist"]);
    expect(result.lyrics).toEqual({});
    // Optional fields should be undefined
    expect(result.albumName).toBeUndefined();
    expect(result.coverUrl).toBeUndefined();
    expect(result.syncOffsetMs).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Edge cases: optional fields omitted
  // -----------------------------------------------------------------------
  it("omits optional fields that are not present", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    const result = parseProjectYaml(yaml);
    expect(result.albumName).toBeUndefined();
    expect(result.coverUrl).toBeUndefined();
    expect(result.isrcs).toBeUndefined();
    expect(result.originLanguage).toBeUndefined();
    expect(result.translationLanguage).toBeUndefined();
    expect(result.songLinkUrl).toBeUndefined();
    expect(result.audioUrl).toBeUndefined();
    expect(result.syncOffsetMs).toBeUndefined();
    expect(result.artistLinks).toBeUndefined();
    expect(result.recommendedSocialLinks).toBeUndefined();
    expect(result.streamingSites).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Boolean handling
  // -----------------------------------------------------------------------
  it("parses locked: true as boolean true", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics:
  - time_start: "00:00.00"
    time_end: "00:01.00"
    original: "Locked"
    translated: "Bloqueado"
    locked: true
`;
    const result = parseProjectYaml(yaml);
    expect(result.lyrics.lrc_00?.locked).toBe(true);
    expect(result.lyrics.lrc_00?.time_start).toBe(0);
    expect(result.lyrics.lrc_00?.time_end).toBe(1000);
  });

  it("defaults locked to false when not present", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics:
  - time_start: "00:00.00"
    time_end: "00:01.00"
    original: "Unlocked"
    translated: "Desbloqueado"
`;
    const result = parseProjectYaml(yaml);
    expect(result.lyrics.lrc_00?.locked).toBe(false);
    expect(result.lyrics.lrc_00?.time_start).toBe(0);
    expect(result.lyrics.lrc_00?.time_end).toBe(1000);
  });

  // -----------------------------------------------------------------------
  // Quoted strings with escapes
  // -----------------------------------------------------------------------
  it("unquotes double-quoted strings and handles \\\" escape", () => {
    const yaml = `version: 1

project:
  title: "Song \\"Title\\""
  track_name: "He said \\"hello\\""
  artists:
    - "Artist \\"The Great\\""

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    const result = parseProjectYaml(yaml);
    expect(result.trackName).toBe('He said "hello"');
  });

  it("handles backslash escape in quoted strings", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: "Path\\\\name"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    const result = parseProjectYaml(yaml);
    expect(result.trackName).toBe("Path\\name");
  });

  // -----------------------------------------------------------------------
  // Integer parsing
  // -----------------------------------------------------------------------
  it("parses version as a number", () => {
    const result = parseProjectYaml(MINIMAL_YAML);
    // Not directly accessible since version is validated but not stored
    // The function should not throw — success is sufficient
    expect(result.trackName).toBe("Minimal Track");
  });

  // -----------------------------------------------------------------------
  // Validation errors
  // -----------------------------------------------------------------------
  it("throws if YAML string is empty", () => {
    expect(() => parseProjectYaml("")).toThrow("YAML input is empty");
  });

  it("throws if version is missing", () => {
    const yaml = `project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    expect(() => parseProjectYaml(yaml)).toThrow("Missing required field: version");
  });

  it("throws if version is not a number", () => {
    const yaml = `version: "one"

project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    expect(() => parseProjectYaml(yaml)).toThrow("Invalid version");
  });

  it("throws if project.track_name is missing", () => {
    const yaml = `version: 1

project:
  title: "Test"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    expect(() => parseProjectYaml(yaml)).toThrow("project.track_name");
  });

  it("throws if project.track_name is empty", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: ""
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    expect(() => parseProjectYaml(yaml)).toThrow("project.track_name");
  });

  it("throws if artists array is empty", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: "Test"
  artists: []

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    expect(() => parseProjectYaml(yaml)).toThrow("project.artists");
  });

  it("throws if lyrics is missing", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0
`;
    expect(() => parseProjectYaml(yaml)).toThrow("lyrics must be an array");
  });

  it("throws if project section is missing", () => {
    const yaml = `version: 1

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    expect(() => parseProjectYaml(yaml)).toThrow("project");
  });

  // -----------------------------------------------------------------------
  // Comments
  // -----------------------------------------------------------------------
  it("ignores comment lines", () => {
    const yaml = `# This is a comment
version: 1

# Another comment
project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A" # inline comment?

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    const result = parseProjectYaml(yaml);
    expect(result.trackName).toBe("Test");
  });

  // -----------------------------------------------------------------------
  // Key ordering / indentation robustness
  // -----------------------------------------------------------------------
  it("handles optional keys in any order", () => {
    const yaml = `version: 1

project:
  track_name: "Ordered"
  title: "Test"
  artists:
    - "A"
  album_name: "Album"

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    const result = parseProjectYaml(yaml);
    expect(result.trackName).toBe("Ordered");
    expect(result.albumName).toBe("Album");
  });

  // -----------------------------------------------------------------------
  // Null handling for streaming sites
  // -----------------------------------------------------------------------
  it("parses null values in streaming_sites correctly", () => {
    const yaml = `version: 1

project:
  title: "Test"
  track_name: "Test"
  artists:
    - "A"
  streaming_sites:
    spotify: "https://spotify.com"
    deezer: null
    apple: null

metadata:
  created_at: 0
  updated_at: 0
  exported_at: 0

lyrics: []
`;
    const result = parseProjectYaml(yaml);
    expect(result.streamingSites?.spotify).toBe("https://spotify.com");
    expect(result.streamingSites?.deezer).toBeNull();
    expect(result.streamingSites?.apple).toBeNull();
  });
});
