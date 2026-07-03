import { useState, useEffect } from "react";
import { getAllProjects, deleteProject } from "@/db/projectRepository";
import type { Project } from "@/types/project";

export interface UseProjectListReturn {
  projects: Project[];
  refreshProjects: () => Promise<void>;
  deleteTarget: Project | null;
  setDeleteTarget: (project: Project | null) => void;
  handleDeleteProject: () => Promise<void>;
}

/**
 * Manages the project list lifecycle: initial load, refresh,
 * and deletion with confirmation state.
 */
export function useProjectList(): UseProjectListReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useEffect(() => {
    getAllProjects().then(setProjects);
  }, []);

  const refreshProjects = async () => {
    const updated = await getAllProjects();
    setProjects(updated);
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    await refreshProjects();
  };

  return {
    projects,
    refreshProjects,
    deleteTarget,
    setDeleteTarget,
    handleDeleteProject,
  };
}
