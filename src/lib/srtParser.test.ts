import { describe, it, expect } from "vitest";
import { parseSrtContent, validateSrtContent } from "./srtParser";

describe("parseSrtContent", () => {
  it("parses a valid single-block SRT", () => {
    const input = `1
00:01:23,456 --> 00:01:26,789
Hello world`;
    const result = parseSrtContent(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.timestamp).toBe(83456); // 1*3600000 + 23*60000 + 456 = 83456
    expect(result[0]!.text).toBe("Hello world");
  });

  it("parses a valid multi-block SRT", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
First line

2
00:00:05,000 --> 00:00:08,500
Second line`;
    const result = parseSrtContent(input);
    expect(result).toHaveLength(2);
    expect(result[0]!.timestamp).toBe(1000);
    expect(result[0]!.text).toBe("First line");
    expect(result[1]!.timestamp).toBe(5000);
    expect(result[1]!.text).toBe("Second line");
  });

  it("handles multi-line text within a block", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
First line
Second line
Third line`;
    const result = parseSrtContent(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("First line\nSecond line\nThird line");
  });

  it("returns empty array for empty input", () => {
    expect(parseSrtContent("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseSrtContent("   \n  \n  ")).toEqual([]);
  });

  it("skips blocks missing the arrow separator", () => {
    const input = `1
00:01:00,000 00:02:00,000
No arrow here`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("skips blocks with invalid hours (>= 24)", () => {
    const input = `1
99:00:00,000 --> 99:00:05,000
Bad hours`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("skips blocks with invalid minutes (>= 60)", () => {
    const input = `1
00:99:00,000 --> 00:99:05,000
Bad minutes`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("skips blocks with invalid seconds (>= 60)", () => {
    const input = `1
00:00:99,000 --> 00:00:99,999
Bad seconds`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("skips blocks where start >= end timestamp", () => {
    const input = `1
00:00:05,000 --> 00:00:01,000
Start after end`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("skips blocks where start equals end timestamp", () => {
    const input = `1
00:00:05,000 --> 00:00:05,000
Same times`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("handles trailing newlines correctly", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello world

`;
    const result = parseSrtContent(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Hello world");
  });

  it("skips blocks with only an index and no timestamp", () => {
    const input = `1`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("handles blocks with index and timestamp but no text", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000`;
    const result = parseSrtContent(input);
    expect(result).toEqual([]);
  });

  it("parses with only valid blocks among invalid ones", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Good block

2
BAD TIMESTAMP LINE
Bad block

3
00:00:05,000 --> 00:00:08,000
Another good`;
    const result = parseSrtContent(input);
    expect(result).toHaveLength(2);
    expect(result[0]!.text).toBe("Good block");
    expect(result[1]!.text).toBe("Another good");
  });

  it("parses SRT with CRLF line endings", () => {
    const input = "1\r\n00:00:01,000 --> 00:00:04,000\r\nHello\r\n";
    const result = parseSrtContent(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Hello");
  });
});

describe("validateSrtContent", () => {
  it("returns valid for correct SRT content", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,000 --> 00:00:08,500
Second line`;
    const result = validateSrtContent(input);
    expect(result).toEqual({ valid: true });
  });

  it("returns error for empty content", () => {
    const result = validateSrtContent("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("returns error for whitespace-only content", () => {
    const result = validateSrtContent("   \n  ");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("returns error for missing arrow separator", () => {
    const input = `1
00:01:00,000 00:02:00,000
No arrow`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("invalid or missing timestamp");
  });

  it("returns error for invalid hours (>= 24)", () => {
    const input = `1
99:00:00,000 --> 99:00:05,000
Bad hours`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Hours out of range");
  });

  it("returns error for invalid minutes (>= 60)", () => {
    const input = `1
00:99:00,000 --> 00:99:05,000
Bad minutes`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minutes out of range");
  });

  it("returns error for invalid seconds (>= 60)", () => {
    const input = `1
00:00:99,000 --> 00:00:99,999
Bad seconds`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Seconds out of range");
  });

  it("returns error when start >= end", () => {
    const input = `1
00:00:05,000 --> 00:00:01,000
Start after end`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("must be before end time");
  });

  it("returns error for block with no text content", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("no text content");
  });

  it("returns error for incomplete block (only index)", () => {
    const input = `1`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("incomplete block");
  });

  it("returns error when no valid blocks found", () => {
    // Single line with no timestamp structure — caught as incomplete block
    const input = `not a valid SRT block at all`;
    const result = validateSrtContent(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("incomplete block");
  });
});
