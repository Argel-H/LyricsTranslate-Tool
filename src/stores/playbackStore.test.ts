import { describe, it, expect, beforeEach } from "vitest";
import { usePlaybackStore } from "./playbackStore";

function resetPlaybackStore(): void {
  usePlaybackStore.setState({ entries: {} });
}

describe("playbackStore", () => {
  beforeEach(resetPlaybackStore);

  it("saves and restores a position for the same project and src", () => {
    const { save, restore } = usePlaybackStore.getState();

    save(1, "audio.mp3", 5000);

    expect(restore(1, "audio.mp3", 10000)).toBe(5000);
  });

  it("returns null for a different project id (duplicate-project guard)", () => {
    const { save, restore } = usePlaybackStore.getState();

    save(1, "audio.mp3", 5000);

    expect(restore(2, "audio.mp3", 10000)).toBeNull();
    expect(usePlaybackStore.getState().entries[1]?.timeMs).toBe(5000);
  });

  it("returns null when the src changed for the same project", () => {
    const { save, restore } = usePlaybackStore.getState();

    save(1, "a.mp3", 5000);

    expect(restore(1, "b.mp3", 10000)).toBeNull();
    expect(usePlaybackStore.getState().entries[1]?.timeMs).toBe(5000);
  });

  it("returns null when the saved position is zero or negative", () => {
    const { save, restore } = usePlaybackStore.getState();

    save(1, "a.mp3", 0);
    expect(restore(1, "a.mp3", 10000)).toBeNull();

    save(1, "a.mp3", -5);
    expect(restore(1, "a.mp3", 10000)).toBeNull();
  });

  it("returns null when the saved position is at or beyond the duration", () => {
    const { save, restore } = usePlaybackStore.getState();

    save(1, "a.mp3", 10000);
    expect(restore(1, "a.mp3", 10000)).toBeNull();

    save(1, "a.mp3", 20000);
    expect(restore(1, "a.mp3", 10000)).toBeNull();
  });

  it("consumes the entry on a successful restore", () => {
    const { save, restore } = usePlaybackStore.getState();

    save(1, "a.mp3", 5000);

    expect(restore(1, "a.mp3", 10000)).toBe(5000);
    expect(restore(1, "a.mp3", 10000)).toBeNull();
  });
});
