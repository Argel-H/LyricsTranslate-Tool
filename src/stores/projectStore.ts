import { create } from "zustand";
import { calculateLyricsProgress } from "@/lib/progressUtils";
import type { Project, LyricLine } from "@/types/project";
import {
  getProject,
  updateLyricLine as dbUpdateLyric,
  updateAllLyrics as dbUpdateAllLyrics,
  updateProjectProgress,
} from "@/db/projectRepository";

interface ProjectState {
  currentProject: Project | null;
  isLoading: boolean;
  loadProject: (id: number) => Promise<void>;
  updateLine: (key: string, field: keyof LyricLine, value: string) => Promise<void>;
  updateAllLines: (lyrics: Record<string, LyricLine>) => Promise<void>;
  setProject: (project: Project) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  isLoading: false,
  loadProject: async (id) => {
    set({ isLoading: true });
    const project = await getProject(id);
    if (project) set({ currentProject: project, isLoading: false });
    else set({ isLoading: false });
  },
  updateLine: async (key, field, value) => {
    const project = get().currentProject;
    if (!project) return;
    const updatedLyrics = { ...project.lyrics };
    if (!updatedLyrics[key]) return;
    updatedLyrics[key] = { ...updatedLyrics[key]!, [field]: value };

    const { progress, status } = calculateLyricsProgress(updatedLyrics);

    set({
      currentProject: {
        ...project,
        lyrics: updatedLyrics,
        progress,
        status,
        updatedAt: Date.now(),
      },
    });
    await dbUpdateLyric(project.id, key, field, value);
    await updateProjectProgress(project.id, progress, status);
  },
  updateAllLines: async (lyrics) => {
    const project = get().currentProject;
    if (!project) return;

    const { progress, status } = calculateLyricsProgress(lyrics);

    set({
      currentProject: { ...project, lyrics, progress, status, updatedAt: Date.now() },
    });
    await dbUpdateAllLyrics(project.id, lyrics);
    await updateProjectProgress(project.id, progress, status);
  },
  setProject: (project) => set({ currentProject: project }),
  clearProject: () => set({ currentProject: null }),
}));
