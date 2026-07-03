import { create } from "zustand";
import type { Project, LyricLine } from "@/types/project";
import { getProject, updateLyricLine as dbUpdateLyric, updateAllLyrics as dbUpdateAllLyrics } from "@/db/projectRepository";

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
    const totalLines = Object.keys(updatedLyrics).length;
    const translatedLines = Object.values(updatedLyrics).filter(l => l.translation.trim()).length;
    const progress = totalLines > 0 ? Math.round((translatedLines / totalLines) * 100) : 0;
    const status = progress === 100 ? "in-review" as const : "in-progress" as const;

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
  },
  updateAllLines: async (lyrics) => {
    const project = get().currentProject;
    if (!project) return;
    const totalLines = Object.keys(lyrics).length;
    const translatedLines = Object.values(lyrics).filter(l => l.translation.trim()).length;
    const progress = totalLines > 0 ? Math.round((translatedLines / totalLines) * 100) : 0;
    const status = progress === 100 ? "in-review" as const : "in-progress" as const;

    set({
      currentProject: { ...project, lyrics, progress, status, updatedAt: Date.now() },
    });
    await dbUpdateAllLyrics(project.id, lyrics);
  },
  setProject: (project) => set({ currentProject: project }),
  clearProject: () => set({ currentProject: null }),
}));
