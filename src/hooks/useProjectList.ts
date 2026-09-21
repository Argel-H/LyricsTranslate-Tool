import { useCallback, useEffect, useState } from "react";
import {
  getAllProjects,
  deleteProject,
  updateProjectProgress,
  updateProjectArchived,
} from "@/db/projectRepository";
import { downloadProjectAsYaml } from "@/lib/exportUtils";
import { PROJECT_STATUS } from "@/lib/config/constants";
import type { Project } from "@/types/project";

export interface UseProjectListOptions {
  includeArchived: boolean;
}

export interface UseProjectListReturn {
  projects: Project[];
  refreshProjects: () => Promise<void>;
  deleteTarget: Project | null;
  setDeleteTarget: (project: Project | null) => void;
  confirmDelete: () => Promise<void>;
  toggleComplete: (project: Project) => Promise<void>;
  toggleArchive: (project: Project) => Promise<void>;
  exportProject: (project: Project) => void;
}

export function useProjectList({
  includeArchived,
}: UseProjectListOptions): UseProjectListReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const refreshProjects = useCallback(async () => {
    const updated = await getAllProjects(includeArchived);
    setProjects(updated);
  }, [includeArchived]);

  // Initial load and reloads when the archive scope changes.
  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    await refreshProjects();
  }, [deleteTarget, refreshProjects]);

  const toggleComplete = useCallback(
    async (project: Project) => {
      const newStatus =
        project.status === PROJECT_STATUS.COMPLETED
          ? PROJECT_STATUS.IN_REVIEW
          : project.status === PROJECT_STATUS.IN_REVIEW
            ? PROJECT_STATUS.COMPLETED
            : project.status;
      if (newStatus === project.status) return;
      await updateProjectProgress(project.id, project.progress, newStatus);
      await refreshProjects();
    },
    [refreshProjects],
  );

  const toggleArchive = useCallback(
    async (project: Project) => {
      await updateProjectArchived(project.id, !project.archived);
      await refreshProjects();
    },
    [refreshProjects],
  );

  const exportProject = useCallback((project: Project) => {
    downloadProjectAsYaml(project);
  }, []);

  return {
    projects,
    refreshProjects,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    toggleComplete,
    toggleArchive,
    exportProject,
  };
}
