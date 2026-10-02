import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useLongPress } from "./useLongPress";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mouseEvent() {
  return { preventDefault: vi.fn() } as unknown as ReactMouseEvent;
}

describe("useLongPress", () => {
  it("exposes all press handlers and wasLongPress() is false initially", () => {
    const { result } = renderHook(() => useLongPress({}));

    expect(typeof result.current.pressHandlers.onPointerDown).toBe("function");
    expect(typeof result.current.pressHandlers.onPointerUp).toBe("function");
    expect(typeof result.current.pressHandlers.onPointerLeave).toBe("function");
    expect(typeof result.current.pressHandlers.onPointerCancel).toBe("function");
    expect(typeof result.current.pressHandlers.onContextMenu).toBe("function");
    expect(result.current.wasLongPress()).toBe(false);
  });

  it("does not fire when released before the delay elapses", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delayMs: 500 }),
    );

    act(() => {
      result.current.pressHandlers.onPointerDown();
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.pressHandlers.onPointerUp();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.wasLongPress()).toBe(false);
  });

  it("fires once after the delay and reports the long press once", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delayMs: 500 }),
    );

    act(() => {
      result.current.pressHandlers.onPointerDown();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(result.current.wasLongPress()).toBe(true);
    expect(result.current.wasLongPress()).toBe(false);
  });

  it("cancels the pending long press on pointer leave", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delayMs: 500 }),
    );

    act(() => {
      result.current.pressHandlers.onPointerDown();
    });
    act(() => {
      result.current.pressHandlers.onPointerLeave();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels the pending long press on pointer cancel", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delayMs: 500 }),
    );

    act(() => {
      result.current.pressHandlers.onPointerDown();
    });
    act(() => {
      result.current.pressHandlers.onPointerCancel();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("prevents the native context menu", () => {
    const { result } = renderHook(() => useLongPress({}));
    const event = mouseEvent();

    act(() => {
      result.current.pressHandlers.onContextMenu(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("does not fire when unmounted before the delay elapses", () => {
    const onLongPress = vi.fn();
    const { result, unmount } = renderHook(() =>
      useLongPress({ onLongPress, delayMs: 500 }),
    );

    act(() => {
      result.current.pressHandlers.onPointerDown();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});
