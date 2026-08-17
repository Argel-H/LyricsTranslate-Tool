import { describe, it, expect } from "vitest";
import { AUDIO_URL_PREFIX, encodeAudioUrl, decodeAudioUrl } from "./audioUrlCodec";

describe("audioUrlCodec", () => {
  it("encodeAudioUrl returns a b64-prefixed string that hides the plain link", () => {
    const link = "https://example.com/audio.mp3";
    const encoded = encodeAudioUrl(link);
    expect(encoded.startsWith("b64:")).toBe(true);
    expect(encoded).toContain(AUDIO_URL_PREFIX);
    expect(encoded).not.toContain(link);
  });

  it("round-trips an ASCII URL", () => {
    const link = "https://example.com/audio.mp3";
    expect(decodeAudioUrl(encodeAudioUrl(link))).toBe(link);
  });

  it("round-trips a URL with non-ASCII characters (UTF-8 safe)", () => {
    const link = "https://example.com/áudio música.mp3?título=ñandú";
    expect(decodeAudioUrl(encodeAudioUrl(link))).toBe(link);
  });

  it("passes through legacy plain links without the prefix unchanged", () => {
    const link = "https://example.com/audio.mp3";
    expect(decodeAudioUrl(link)).toBe(link);
  });

  it("decodes a known b64-prefixed value back to the plain link", () => {
    expect(decodeAudioUrl("b64:aHR0cHM6Ly9leGFtcGxlLmNvbS9hdWRpby5tcDM=")).toBe(
      "https://example.com/audio.mp3",
    );
  });

  it("throws when the value has the prefix but the base64 payload is invalid", () => {
    expect(() => decodeAudioUrl("b64:@@@not-base64@@@")).toThrow();
  });
});
