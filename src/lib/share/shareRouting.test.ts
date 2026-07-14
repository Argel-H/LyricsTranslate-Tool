import { describe, it, expect } from "vitest";
import { isPasteId, stripShareBase } from "./shareRouting";

describe("isPasteId", () => {
  it("accepts valid 6-20 char strings, rejects symbols and empty", () => {
    expect(isPasteId("abc123")).toBe(true);
    expect(isPasteId("a".repeat(20))).toBe(true);
    expect(isPasteId("a".repeat(21))).toBe(false);
    expect(isPasteId("")).toBe(false);
    expect(isPasteId("abc/123")).toBe(false);
    expect(isPasteId("abc-123")).toBe(false);
    expect(isPasteId("abc_123")).toBe(false);
  });
});

describe("stripShareBase", () => {
  it("strips https/http prefix and returns input unchanged when no match", () => {
    expect(stripShareBase("https://example.com/s/abc123")).toBe("abc123");
    expect(stripShareBase("http://example.com/s/xyz")).toBe("xyz");
    expect(stripShareBase("abc123")).toBe("abc123");
  });
});
