import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFullMetadata } from "@/services/metadataAggregator";
import { createProject } from "@/db/projectRepository";
import { useI18n } from "@/hooks/useI18n";
import type { LRCLibResult } from "@/types/music";

export interface UseProjectCreationReturn {
  isCreating: boolean;
  creationStatus: string;
  handleSearchSelect: (
    searchResults: LRCLibResult[] | undefined,
    index: number,
  ) => Promise<void>;
}

/**
 * Manages the project creation pipeline orchestration:
 *   search select → getFullMetadata → createProject → navigate.
 */
export function useProjectCreation(): UseProjectCreationReturn {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState("");

  const handleSearchSelect = async (
    searchResults: LRCLibResult[] | undefined,
    index: number,
  ) => {
    if (!searchResults?.[index]) return;
    setIsCreating(true);
    setCreationStatus(t("dashboard.fetchingLyrics"));
    try {
      const result = searchResults[index]!;
      setCreationStatus(t("dashboard.lookingUp"));
      const metadata = await getFullMetadata(
        result.artistName,
        result.trackName,
        result,
      );
      setCreationStatus(t("dashboard.creatingProjectDesc"));
      const projectId = await createProject(metadata);
      navigate(`/editor/${projectId}`);
    } catch {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    creationStatus,
    handleSearchSelect,
  };
}
