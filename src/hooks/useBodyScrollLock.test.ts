import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBodyScrollLock } from "./useBodyScrollLock";

describe("useBodyScrollLock", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("hides body overflow while a single lock is active", () => {
    const lock = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");

    lock.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("does not modify overflow while inactive", () => {
    document.body.style.overflow = "scroll";

    const lock = renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe("scroll");

    lock.unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("keeps overflow hidden until the last nested lock unmounts", () => {
    const outer = renderHook(() => useBodyScrollLock(true));
    const inner = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");

    outer.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    inner.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the previous overflow value rather than hardcoding empty", () => {
    document.body.style.overflow = "scroll";

    const lock = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");

    lock.unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("releases and re-acquires cleanly when active toggles", () => {
    document.body.style.overflow = "scroll";

    const lock = renderHook(
      ({ active }: { active: boolean }) => useBodyScrollLock(active),
      { initialProps: { active: true } },
    );
    expect(document.body.style.overflow).toBe("hidden");

    lock.rerender({ active: false });
    expect(document.body.style.overflow).toBe("scroll");

    lock.rerender({ active: true });
    expect(document.body.style.overflow).toBe("hidden");

    lock.unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });
});
