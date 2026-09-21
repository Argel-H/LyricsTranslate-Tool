import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorHistory } from "./useEditorHistory";
import { useHistoryStore } from "@/stores/historyStore";
import type { LyricLine } from "@/types/project";

// The hook reads the project store only via getState(), so stub it directly.
const { projectState } = vi.hoisted(() => ({
  projectState: {
    currentProject: null as null | {
      id: number;
      lyrics: Record<string, LyricLine>;
      notes?: { id: number; text: string }[];
    },
    updateAllLines: vi.fn(),
    setNotes: vi.fn(),
  },
}));

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: {
    getState: () => projectState,
  },
}));

function line(overrides: Partial<LyricLine> = {}): LyricLine {
  return {
    time_start: 0,
    time_end: 1000,
    lyric: "lyric",
    translation: "",
    ...overrides,
  };
}

function project(
  lyrics: Record<string, LyricLine>,
  id = 1,
  notes: { id: number; text: string }[] = [],
) {
  return { id, lyrics, notes };
}

function makeRef(current: Record<string, LyricLine> | null) {
  return { current };
}

beforeEach(() => {
  useHistoryStore.setState({ undoStack: [], redoStack: [], projectId: null });
  projectState.currentProject = null;
  projectState.updateAllLines.mockClear();
  projectState.setNotes.mockClear();
});

describe("useEditorHistory", () => {
  it("exposes canUndo/canRedo from the history store", () => {
    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: null, activeLyricsRef: makeRef(null) }),
    );
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      useHistoryStore.setState({
        undoStack: [{ lyrics: { l1: line() }, notes: [] }],
      });
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      useHistoryStore.setState({
        redoStack: [{ lyrics: { l1: line() }, notes: [] }],
      });
    });
    expect(result.current.canRedo).toBe(true);
  });

  it("snapshot() pushes the current project lyrics + notes", () => {
    projectState.currentProject = project({ l1: line({ lyric: "one" }) }, 7, [
      { id: 0, text: "note" },
    ]);
    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: null, activeLyricsRef: makeRef(null) }),
    );

    act(() => result.current.snapshot());

    const { undoStack, projectId } = useHistoryStore.getState();
    expect(undoStack).toHaveLength(1);
    expect(undoStack[0].lyrics).toEqual({ l1: line({ lyric: "one" }) });
    expect(undoStack[0].notes).toEqual([{ id: 0, text: "note" }]);
    expect(projectId).toBe(7);
  });

  it("snapshot() is a no-op when there is no current project", () => {
    projectState.currentProject = null;
    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: null, activeLyricsRef: makeRef(null) }),
    );

    act(() => result.current.snapshot());

    expect(useHistoryStore.getState().undoStack).toHaveLength(0);
  });

  it("pushLeaving() pushes the leaving snapshot on a row transition", () => {
    const leavingLyrics = { l1: line({ translation: "before" }) };
    projectState.currentProject = project({
      l1: line({ translation: "after" }),
      l2: line(),
    });
    const { result } = renderHook(() =>
      useEditorHistory({
        activeLineKey: "l1",
        activeLyricsRef: makeRef(leavingLyrics),
      }),
    );

    act(() => result.current.pushLeaving("l2"));

    expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    expect(useHistoryStore.getState().undoStack[0].lyrics).toEqual(
      leavingLyrics,
    );
  });

  it("pushLeaving() with the same row does NOT push when unchanged (bug fix #1)", () => {
    const same = { l1: line({ translation: "same" }) };
    projectState.currentProject = project({ l1: line({ translation: "same" }) });
    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: "l1", activeLyricsRef: makeRef(same) }),
    );

    act(() => result.current.pushLeaving("l1"));

    expect(useHistoryStore.getState().undoStack).toHaveLength(0);
  });

  it("pushLeaving() with the same row pushes when state changed (bug fix #1)", () => {
    const leaving = { l1: line({ translation: "before" }) };
    projectState.currentProject = project({ l1: line({ translation: "after" }) });
    const { result } = renderHook(() =>
      useEditorHistory({
        activeLineKey: "l1",
        activeLyricsRef: makeRef(leaving),
      }),
    );

    act(() => result.current.pushLeaving("l1"));

    expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    expect(useHistoryStore.getState().undoStack[0].lyrics).toEqual(leaving);
  });

  it("pushLeaving() is a no-op when there is no active row", () => {
    projectState.currentProject = project({ l1: line() });
    const { result } = renderHook(() =>
      useEditorHistory({
        activeLineKey: null,
        activeLyricsRef: makeRef({ l1: line() }),
      }),
    );

    act(() => result.current.pushLeaving("l1"));

    expect(useHistoryStore.getState().undoStack).toHaveLength(0);
  });

  it("undo() restores the previous snapshot and moves current onto the redo stack", () => {
    const restored = { l1: line({ translation: "old" }) };
    const current = { l1: line({ translation: "new" }) };
    projectState.currentProject = project(current, 1, [{ id: 0, text: "n" }]);
    useHistoryStore.setState({
      undoStack: [{ lyrics: restored, notes: [] }],
      redoStack: [],
      projectId: 1,
    });

    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: null, activeLyricsRef: makeRef(null) }),
    );

    act(() => result.current.undo());

    expect(projectState.updateAllLines).toHaveBeenCalledWith(restored);
    expect(projectState.setNotes).toHaveBeenCalledWith([]);

    const state = useHistoryStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);
    expect(state.redoStack[0].lyrics).toEqual(current);
  });

  it("redo() restores the next snapshot and returns current to the undo stack", () => {
    const current = { l1: line({ translation: "old" }) };
    const next = { l1: line({ translation: "new" }) };
    projectState.currentProject = project(current, 1);
    useHistoryStore.setState({
      undoStack: [{ lyrics: current, notes: [] }],
      redoStack: [{ lyrics: next, notes: [] }],
      projectId: 1,
    });

    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: null, activeLyricsRef: makeRef(null) }),
    );

    act(() => result.current.redo());

    expect(projectState.updateAllLines).toHaveBeenCalledWith(next);
    expect(projectState.setNotes).toHaveBeenCalledWith([]);

    const state = useHistoryStore.getState();
    expect(state.redoStack).toHaveLength(0);
    expect(state.undoStack).toHaveLength(2);
    expect(state.undoStack[1].lyrics).toEqual(current);
  });

  it("undo()/redo() are no-ops when the stacks are empty", () => {
    projectState.currentProject = project({ l1: line() });
    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: null, activeLyricsRef: makeRef(null) }),
    );

    act(() => {
      result.current.undo();
      result.current.redo();
    });

    expect(projectState.updateAllLines).not.toHaveBeenCalled();
    expect(projectState.setNotes).not.toHaveBeenCalled();
  });

  it("undo() is a no-op when there is no current project", () => {
    projectState.currentProject = null;
    useHistoryStore.setState({
      undoStack: [{ lyrics: { l1: line() }, notes: [] }],
      redoStack: [],
      projectId: 1,
    });
    const { result } = renderHook(() =>
      useEditorHistory({ activeLineKey: null, activeLyricsRef: makeRef(null) }),
    );

    act(() => result.current.undo());

    expect(projectState.updateAllLines).not.toHaveBeenCalled();
  });
});
