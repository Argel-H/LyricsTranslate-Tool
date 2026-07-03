import { useNavigate } from "react-router-dom";
import { useLyricEditor } from "@/hooks/useLyricEditor";
import { useTranslationManager } from "@/hooks/useTranslationManager";
import { useExportManager } from "@/hooks/useExportManager";

export function useEditorActions(projectId: string | undefined) {
  const navigate = useNavigate();
  const lyricEditor = useLyricEditor(projectId);
  const translationManager = useTranslationManager();
  const exportManager = useExportManager();

  return {
    currentProject: lyricEditor.currentProject,
    isLoading: lyricEditor.isLoading,
    activeLineKey: lyricEditor.activeLineKey,
    setActiveLineKey: lyricEditor.setActiveLineKey,
    tableRef: lyricEditor.tableRef,
    lyricsEntries: lyricEditor.lyricsEntries,
    handleAddLine: lyricEditor.addLine,
    handleDeleteLine: lyricEditor.deleteLine,
    handleTimeAdjust: lyricEditor.adjustTimestamp,
    updateLine: lyricEditor.updateLine,
    translating: translationManager.isTranslating,
    translationProgress: translationManager.translatedCount,
    translationTotal: translationManager.totalToTranslate,
    handleAutoTranslate: translationManager.startAutoTranslate,
    exportDialogOpen: exportManager.exportDialogOpen,
    setExportDialogOpen: exportManager.setExportDialogOpen,
    handleDownload: exportManager.downloadFile,
    goBack: () => navigate("/"),
    goToEdit: () => navigate(`/edit-project/${projectId}`),
  };
}
