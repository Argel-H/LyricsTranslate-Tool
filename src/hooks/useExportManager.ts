import { useState, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { generateLrcContent, generateSrtContent, downloadTextFile } from "@/lib/exportUtils";

export function useExportManager() {
  const { currentProject } = useProjectStore();

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const openExportDialog = useCallback(() => setExportDialogOpen(true), []);
  const closeExportDialog = useCallback(() => setExportDialogOpen(false), []);

  const downloadFile = useCallback(
    (format: "lrc" | "srt", useTranslation: boolean) => {
      if (!currentProject) return;
      const content = format === "lrc"
        ? generateLrcContent(currentProject.lyrics, useTranslation)
        : generateSrtContent(currentProject.lyrics, useTranslation);
      const extension = format === "lrc" ? ".lrc" : ".srt";
      const suffix = useTranslation ? "_translated" : "_original";
      const filename = `${currentProject.trackName}${suffix}${extension}`;
      downloadTextFile(content, filename);
      setExportDialogOpen(false);
    },
    [currentProject],
  );

  return {
    exportDialogOpen,
    openExportDialog,
    closeExportDialog,
    setExportDialogOpen,
    downloadFile,
  };
}
