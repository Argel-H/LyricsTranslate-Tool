import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExportManager } from './useExportManager';

const mockProject = {
  id: 1,
  trackName: 'Test Song',
  lyrics: {
    lrc_00: { time_start: '00:01.00', time_end: '00:04.00', lyric: 'Hello', translation: 'Hola', comment: '' },
  },
};

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

vi.mock('@/lib/exportUtils', () => ({
  generateLrcContent: vi.fn(() => '[00:01.00] Hello'),
  generateSrtContent: vi.fn(() => '1\n00:01,00 --> 00:04,00\nHello'),
  downloadTextFile: vi.fn(),
}));

import { useProjectStore } from '@/stores/projectStore';
import { generateLrcContent, generateSrtContent, downloadTextFile } from '@/lib/exportUtils';

const mockUseProjectStore = vi.mocked(useProjectStore);
const mockGenerateLrcContent = vi.mocked(generateLrcContent);
const mockGenerateSrtContent = vi.mocked(generateSrtContent);
const mockDownloadTextFile = vi.mocked(downloadTextFile);

describe('useExportManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectStore.mockReturnValue({ currentProject: mockProject });
  });

  it('has exportDialogOpen false by default', () => {
    const { result } = renderHook(() => useExportManager());
    expect(result.current.exportDialogOpen).toBe(false);
  });

  it('sets exportDialogOpen to true when openExportDialog is called', () => {
    const { result } = renderHook(() => useExportManager());
    act(() => {
      result.current.openExportDialog();
    });
    expect(result.current.exportDialogOpen).toBe(true);
  });

  it('sets exportDialogOpen to false when closeExportDialog is called', () => {
    const { result } = renderHook(() => useExportManager());
    act(() => {
      result.current.openExportDialog();
    });
    expect(result.current.exportDialogOpen).toBe(true);
    act(() => {
      result.current.closeExportDialog();
    });
    expect(result.current.exportDialogOpen).toBe(false);
  });

  it('generates LRC content and downloads when format is "lrc"', () => {
    const { result } = renderHook(() => useExportManager());
    act(() => {
      result.current.downloadFile('lrc', false);
    });
    expect(mockGenerateLrcContent).toHaveBeenCalledWith(mockProject.lyrics, false);
    expect(mockDownloadTextFile).toHaveBeenCalledWith('[00:01.00] Hello', 'Test Song_original.lrc');
  });

  it('generates SRT content and downloads when format is "srt"', () => {
    const { result } = renderHook(() => useExportManager());
    act(() => {
      result.current.downloadFile('srt', false);
    });
    expect(mockGenerateSrtContent).toHaveBeenCalledWith(mockProject.lyrics, false);
    expect(mockDownloadTextFile).toHaveBeenCalledWith('1\n00:01,00 --> 00:04,00\nHello', 'Test Song_original.srt');
  });

  it('uses translation text when useTranslation is true', () => {
    const { result } = renderHook(() => useExportManager());
    act(() => {
      result.current.downloadFile('lrc', true);
    });
    expect(mockGenerateLrcContent).toHaveBeenCalledWith(mockProject.lyrics, true);
    expect(mockDownloadTextFile).toHaveBeenCalledWith('[00:01.00] Hello', 'Test Song_translated.lrc');
  });

  it('closes dialog after download', () => {
    const { result } = renderHook(() => useExportManager());
    act(() => {
      result.current.openExportDialog();
    });
    expect(result.current.exportDialogOpen).toBe(true);
    act(() => {
      result.current.downloadFile('lrc', false);
    });
    expect(result.current.exportDialogOpen).toBe(false);
  });

  it('does nothing if currentProject is null', () => {
    mockUseProjectStore.mockReturnValue({ currentProject: null });
    const { result } = renderHook(() => useExportManager());
    act(() => {
      result.current.downloadFile('lrc', false);
    });
    expect(mockGenerateLrcContent).not.toHaveBeenCalled();
    expect(mockDownloadTextFile).not.toHaveBeenCalled();
  });
});
