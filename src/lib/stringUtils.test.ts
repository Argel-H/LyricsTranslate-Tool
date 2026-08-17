import { describe, it, expect } from "vitest";
import { trimToUndefined } from "./stringUtils";

describe("trimToUndefined", () => {
  it("returns undefined for null", () => {
    expect(trimToUndefined(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(trimToUndefined(undefined)).toBeUndefined();
  });

  it("returns undefined for whitespace-only strings", () => {
    expect(trimToUndefined("   ")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(trimToUndefined("")).toBeUndefined();
  });

  it("returns the trimmed string for a normal value", () => {
    expect(trimToUndefined("hello")).toBe("hello");
  });

  it("converts numbers via String()", () => {
    expect(trimToUndefined(42)).toBe("42");
  });

  it("trims surrounding whitespace", () => {
    expect(trimToUndefined("  hello world  ")).toBe("hello world");
  });
});
