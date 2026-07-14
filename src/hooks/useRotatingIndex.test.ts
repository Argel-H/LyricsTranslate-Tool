import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRotatingIndex } from "./useRotatingIndex";

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query !== "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useRotatingIndex", () => {
  it("starts at 0", () => {
    const { result } = renderHook(() => useRotatingIndex(3, 2000));
    expect(result.current).toBe(0);
  });

  it("advances to the next index after intervalMs", () => {
    const { result } = renderHook(() => useRotatingIndex(3, 2000));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(2);
  });

  it("wraps around at the end", () => {
    const { result } = renderHook(() => useRotatingIndex(3, 2000));

    act(() => {
      vi.advanceTimersByTime(2000 * 3);
    });
    expect(result.current).toBe(0);
  });

  it("does not advance when count <= 1", () => {
    const { result } = renderHook(() => useRotatingIndex(1, 2000));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2000 * 10);
    });
    expect(result.current).toBe(0);
  });

  it("respects prefers-reduced-motion: reduce", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useRotatingIndex(3, 2000));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2000 * 10);
    });
    expect(result.current).toBe(0);
  });
});
