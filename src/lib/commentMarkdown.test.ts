import { describe, it, expect } from "vitest";
import { applyCommentStyle, isUrl, truncateUrl } from "./commentMarkdown";

describe("applyCommentStyle", () => {
  describe("bold", () => {
    it("wraps the selection with ** and keeps it selected", () => {
      const result = applyCommentStyle("hello world", 0, 5, "bold");
      expect(result.text).toBe("**hello** world");
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(7);
    });

    it("inserts empty markers with the cursor between them when nothing is selected", () => {
      const result = applyCommentStyle("hello", 2, 2, "bold");
      expect(result.text).toBe("he****llo");
      expect(result.selectionStart).toBe(4);
      expect(result.selectionEnd).toBe(4);
    });
  });

  describe("italic", () => {
    it("wraps the selection with a single * on each side", () => {
      const result = applyCommentStyle("hello world", 6, 11, "italic");
      expect(result.text).toBe("hello *world*");
      expect(result.selectionStart).toBe(7);
      expect(result.selectionEnd).toBe(12);
    });
  });

  describe("underline", () => {
    it("wraps the selection with <u> tags", () => {
      const result = applyCommentStyle("hello world", 6, 11, "underline");
      expect(result.text).toBe("hello <u>world</u>");
      expect(result.selectionStart).toBe(9);
      expect(result.selectionEnd).toBe(14);
    });
  });

  describe("highlight", () => {
    it("wraps the selection with == markers", () => {
      const result = applyCommentStyle("hello world", 6, 11, "highlight");
      expect(result.text).toBe("hello ==world==");
      expect(result.selectionStart).toBe(8);
      expect(result.selectionEnd).toBe(13);
    });
  });

  describe("link", () => {
    it("wraps the selected text as a link and selects the label", () => {
      const result = applyCommentStyle(
        "visit example",
        6,
        13,
        "link",
        "https://example.com",
      );
      expect(result.text).toBe("visit [example](https://example.com)");
      expect(result.selectionStart).toBe(7);
      expect(result.selectionEnd).toBe(14);
    });

    it("uses 'text' as the label and 'https://' as the url when nothing is selected", () => {
      const result = applyCommentStyle("hello", 2, 2, "link");
      expect(result.text).toBe("he[text](https://)llo");
      expect(result.selectionStart).toBe(3);
      expect(result.selectionEnd).toBe(7);
    });

    it("trims whitespace from the provided url", () => {
      const result = applyCommentStyle(
        "x",
        0,
        0,
        "link",
        "  https://example.com  ",
      );
      expect(result.text).toBe("[text](https://example.com)x");
      expect(result.selectionStart).toBe(1);
      expect(result.selectionEnd).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("clamps out-of-range selections to the string bounds", () => {
      const result = applyCommentStyle("abc", -10, 100, "bold");
      expect(result.text).toBe("**abc**");
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(5);
    });

    it("normalizes a reversed selection (start > end)", () => {
      const result = applyCommentStyle("hello", 4, 1, "italic");
      expect(result.text).toBe("h*ell*o");
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(5);
    });

    it("applies a style at the very end of the string", () => {
      const result = applyCommentStyle("hello", 5, 5, "highlight");
      expect(result.text).toBe("hello====");
      expect(result.selectionStart).toBe(7);
      expect(result.selectionEnd).toBe(7);
    });

    it("applies a style to the full string", () => {
      const result = applyCommentStyle("hi", 0, 2, "bold");
      expect(result.text).toBe("**hi**");
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(4);
    });
  });
});

describe("isUrl", () => {
  it.each([
    "https://example.com",
    "http://example.com",
    "www.example.com",
  ])("accepts %s", (value) => {
    expect(isUrl(value)).toBe(true);
  });

  it.each(["example.com", "hello world", ""])("rejects %j", (value) => {
    expect(isUrl(value)).toBe(false);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isUrl("  https://example.com  ")).toBe(true);
  });
});

describe("truncateUrl", () => {
  it("returns a URL shorter than max unchanged", () => {
    expect(truncateUrl("https://ex.com", 50)).toBe("https://ex.com");
  });

  it("returns a URL exactly at max length unchanged", () => {
    expect(truncateUrl("https://example.com/very/long/path", 34)).toBe(
      "https://example.com/very/long/path",
    );
  });

  it("truncates a URL longer than max to maxLength chars plus an ellipsis", () => {
    expect(truncateUrl("https://example.com/very/long/path", 10)).toBe(
      "https://ex…",
    );
  });
});
