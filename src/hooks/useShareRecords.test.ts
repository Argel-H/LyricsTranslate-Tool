import { describe, it, expect, afterEach, vi } from "vitest";
import { isExpired, formatTimeLeft } from "./useShareRecords";
import type { ShareRecord } from "@/db/database";
import type { I18nKey } from "@/i18n";

const NOW = 1_700_000_000_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function makeRecord(overrides: Partial<ShareRecord> = {}): ShareRecord {
  return {
    id: 1,
    projectId: 1,
    shortId: "abc123",
    createdAt: NOW,
    expiresAt: NOW + MS_PER_DAY,
    ...overrides,
  };
}

function makeT(): (key: I18nKey) => string {
  return (key) => (key === "share.expired" ? "Expired" : key);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isExpired", () => {
  it("returns false for a future expiration timestamp", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(isExpired(makeRecord({ expiresAt: NOW + 1 }))).toBe(false);
  });

  it("returns true for a past expiration timestamp", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(isExpired(makeRecord({ expiresAt: NOW - 1 }))).toBe(true);
  });

  it("treats the exact expiration instant as expired", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(isExpired(makeRecord({ expiresAt: NOW }))).toBe(true);
  });
});

describe("formatTimeLeft", () => {
  it("returns the i18n expired label for a past timestamp", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(formatTimeLeft(NOW - 1, makeT())).toBe("Expired");
  });

  it("returns the i18n expired label at the exact expiration instant", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(formatTimeLeft(NOW, makeT())).toBe("Expired");
  });

  it("formats sub-day durations as whole hours", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(formatTimeLeft(NOW + 2 * MS_PER_HOUR + 30 * 60_000, makeT())).toBe(
      "2h",
    );
  });

  it("floors sub-hour durations to 0h (still not expired)", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(formatTimeLeft(NOW + 59 * 60_000, makeT())).toBe("0h");
  });

  it("formats multi-day durations as days and remaining hours", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(formatTimeLeft(NOW + MS_PER_DAY + 3 * MS_PER_HOUR, makeT())).toBe(
      "1d 3h",
    );
  });

  it("formats whole-day durations with 0h remainder", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    expect(formatTimeLeft(NOW + 2 * MS_PER_DAY, makeT())).toBe("2d 0h");
  });
});
