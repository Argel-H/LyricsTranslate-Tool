import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLyricEditor } from './useLyricEditor';

const mockLoadProject = vi.fn();
const mockUpdateLine = vi.fn();
const mockUpdateAllLines = vi.fn();

const defaultStoreState = {
  currentProject: null,
  isLoading: false,
  loadProject: mockLoadProject,
  updateLine: mockUpdateLine,
  updateAllLines: mockUpdateAllLines,
};

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

import { useProjectStore } from '@/stores/projectStore';
const mockUseProjectStore = vi.mocked(useProjectStore);

const sampleLyrics = {
  lrc_00: { time_start: '00:00.00', time_end: '00:04.00', lyric: 'First', translation: '', comment: '' },
  lrc_01: { time_start: '00:04.00', time_end: '00:08.00', lyric: 'Second', translation: '', comment: '' },
  lrc_02: { time_start: '00:08.00', time_end: '00:12.00', lyric: 'Third', translation: '', comment: '' },
};

const sampleProject = {
  id: 1,
  title: 'Test',
  artistName: ['Test Artist'],
  trackName: 'Test Song',
  lyrics: sampleLyrics,
  status: 'in-progress' as const,
  progress: 0,
  createdAt: 0,
  updatedAt: 0,
};

describe('useLyricEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectStore.mockReturnValue(defaultStoreState);
  });

  it('loads project on mount when projectId is provided', () => {
    renderHook(() => useLyricEditor('42'));
    expect(mockLoadProject).toHaveBeenCalledWith(42);
  });

  it('does not load project when projectId is undefined', () => {
    renderHook(() => useLyricEditor(undefined));
    expect(mockLoadProject).not.toHaveBeenCalled();
  });

  it('returns empty lyricsEntries when currentProject is null', () => {
    const { result } = renderHook(() => useLyricEditor(undefined));
    expect(result.current.lyricsEntries).toEqual([]);
  });

  it('computes lyricsEntries from currentProject.lyrics', () => {
    mockUseProjectStore.mockReturnValue({
      ...defaultStoreState,
      currentProject: sampleProject,
    });
    const { result } = renderHook(() => useLyricEditor(undefined));
    expect(result.current.lyricsEntries).toEqual(Object.entries(sampleLyrics));
  });

  describe('addLine', () => {
    it('adds a new line at the end with a sequential key', async () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      await act(async () => {
        await result.current.addLine();
      });

      expect(mockUpdateAllLines).toHaveBeenCalledTimes(1);
      const updatedLyrics = mockUpdateAllLines.mock.calls[0][0];
      expect(updatedLyrics).toHaveProperty('lrc_03');
      expect(updatedLyrics.lrc_03.time_start).toBe('00:12.00');
      expect(updatedLyrics.lrc_03.time_end).toBe('00:15.00');
      expect(updatedLyrics.lrc_03.lyric).toBe('');
      expect(result.current.activeLineKey).toBe('lrc_03');
    });

    it('does nothing when there is no currentProject', async () => {
      const { result } = renderHook(() => useLyricEditor(undefined));

      await act(async () => {
        await result.current.addLine();
      });

      expect(mockUpdateAllLines).not.toHaveBeenCalled();
    });

    it('starts from time 0 when project has no lyrics', async () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: { ...sampleProject, lyrics: {} },
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      await act(async () => {
        await result.current.addLine();
      });

      const updatedLyrics = mockUpdateAllLines.mock.calls[0][0];
      const keys = Object.keys(updatedLyrics);
      expect(keys).toHaveLength(1);
      expect(updatedLyrics[keys[0]!].time_start).toBe('00:00.00');
    });
  });

  describe('deleteLine', () => {
    it('removes a line and clears activeLineKey if the deleted line was active', async () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      act(() => {
        result.current.setActiveLineKey('lrc_01');
      });
      expect(result.current.activeLineKey).toBe('lrc_01');

      await act(async () => {
        await result.current.deleteLine('lrc_01');
      });

      expect(mockUpdateAllLines).toHaveBeenCalledTimes(1);
      const updatedLyrics = mockUpdateAllLines.mock.calls[0][0];
      expect(updatedLyrics).not.toHaveProperty('lrc_01');
      expect(result.current.activeLineKey).toBeNull();
    });

    it('does not clear activeLineKey if a different line is deleted', async () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      act(() => {
        result.current.setActiveLineKey('lrc_01');
      });

      await act(async () => {
        await result.current.deleteLine('lrc_00');
      });

      expect(result.current.activeLineKey).toBe('lrc_01');
    });

    it('does nothing when there is no currentProject', async () => {
      const { result } = renderHook(() => useLyricEditor(undefined));

      await act(async () => {
        await result.current.deleteLine('lrc_00');
      });

      expect(mockUpdateAllLines).not.toHaveBeenCalled();
    });
  });

  describe('adjustTimestamp', () => {
    it('respects min boundary for time_start (cannot go before previous line time_end)', () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      // line lrc_01 has time_start=00:04.00, previous line time_end=00:04.00
      // decreasing by 100ms would give 00:03.90 which is < 00:04.00 (minimum)
      act(() => {
        result.current.adjustTimestamp('lrc_01', 'time_start', -1);
      });

      expect(mockUpdateLine).not.toHaveBeenCalled();
    });

    it('allows valid time_start adjustment within bounds', () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      // line lrc_01 has time_start=00:04.00, increasing by 100ms gives 00:04.10
      // max is time_end - 100ms = 00:07.90; 00:04.10 < 00:07.90, should pass
      act(() => {
        result.current.adjustTimestamp('lrc_01', 'time_start', 1);
      });

      expect(mockUpdateLine).toHaveBeenCalledWith('lrc_01', 'time_start', '00:04.10');
    });

    it('clamps time_start minimum to 0 for the first line', () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      // line lrc_00 has time_start=00:00.00, decreasing would give -100ms, minimum is 0
      act(() => {
        result.current.adjustTimestamp('lrc_00', 'time_start', -1);
      });

      expect(mockUpdateLine).not.toHaveBeenCalled();
    });

    it('respects max boundary for time_end (cannot go past next line time_start)', () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      // line lrc_00 has time_end=00:04.00, increasing by 100ms gives 00:04.10
      // max is next line time_start=00:04.00; 00:04.10 > 00:04.00, should fail
      act(() => {
        result.current.adjustTimestamp('lrc_00', 'time_end', 1);
      });

      expect(mockUpdateLine).not.toHaveBeenCalled();
    });

    it('does nothing when there is no currentProject', () => {
      const { result } = renderHook(() => useLyricEditor(undefined));

      act(() => {
        result.current.adjustTimestamp('lrc_00', 'time_start', 1);
      });

      expect(mockUpdateLine).not.toHaveBeenCalled();
    });

    it('does nothing when the key does not exist', () => {
      mockUseProjectStore.mockReturnValue({
        ...defaultStoreState,
        currentProject: sampleProject,
      });
      const { result } = renderHook(() => useLyricEditor(undefined));

      act(() => {
        result.current.adjustTimestamp('nonexistent', 'time_start', 1);
      });

      expect(mockUpdateLine).not.toHaveBeenCalled();
    });
  });

  describe('click outside', () => {
    it('deactivates activeLineKey on click outside', () => {
      const { result } = renderHook(() => useLyricEditor(undefined));

      // Attach a real DOM element to the ref
      const div = document.createElement('div');
      result.current.tableRef.current = div;

      // Activate a line
      act(() => {
        result.current.setActiveLineKey('lrc_00');
      });
      expect(result.current.activeLineKey).toBe('lrc_00');

      // Fire mousedown on document (outside the ref element)
      act(() => {
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });
      expect(result.current.activeLineKey).toBeNull();
    });

    it('does not deactivate when clicking inside the ref element', () => {
      const { result } = renderHook(() => useLyricEditor(undefined));

      const div = document.createElement('div');
      result.current.tableRef.current = div;

      act(() => {
        result.current.setActiveLineKey('lrc_00');
      });

      // Fire mousedown on the div itself (inside the ref)
      act(() => {
        div.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });
      // Should still be active since click was inside the ref
      expect(result.current.activeLineKey).toBe('lrc_00');
    });
  });
});
