import { db } from "./database";
import type { Project, ProjectCreateInput, LyricLine } from "@/types/project";
import type { ProjectStatus } from "@/lib/constants";
import { calculateLyricsProgress } from "@/lib/progressUtils";

export async function createProject(input: ProjectCreateInput): Promise<number> {
  const id = Date.now();
  const now = Date.now();
  const { progress, status } = calculateLyricsProgress(input.lyrics);
  const project: Project = {
    id,
    title: `${input.artistName[0]} - ${input.trackName}`,
    artistName: input.artistName,
    trackName: input.trackName,
    lyrics: input.lyrics,
    status,
    progress,
    coverUrl: input.coverUrl,
    isrcs: input.isrcs,
    streamingSites: input.streamingSites,
    originLanguage: input.originLanguage,
    translationLanguage: input.translationLanguage,
    albumName: input.albumName,
    songLinkUrl: input.songLinkUrl,
    artistLinks: input.artistLinks,
    recommendedSocialLinks: input.recommendedSocialLinks,
    createdAt: now,
    updatedAt: now,
  };
  await db.projects.add(JSON.parse(JSON.stringify(project)));
  return id;
}

export async function getProject(id: number): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function updateProject(
  id: number,
  updates: Partial<Pick<Project, "title" | "status" | "progress" | "coverUrl" | "streamingSites" | "originLanguage" | "translationLanguage" | "artistName" | "trackName" | "albumName" | "songLinkUrl" | "recommendedSocialLinks" | "artistLinks">>,
): Promise<void> {
  await db.projects.update(id, { ...updates, updatedAt: Date.now() });
}

export async function updateLyricLine(
  projectId: number,
  lineKey: string,
  field: keyof LyricLine,
  value: string,
): Promise<void> {
  const project = await db.projects.get(projectId);
  if (!project?.lyrics[lineKey]) return;
  const updatedLyrics = { ...project.lyrics };
  updatedLyrics[lineKey] = { ...updatedLyrics[lineKey]!, [field]: value };

  await db.projects.update(projectId, {
    lyrics: updatedLyrics,
  });
}

export async function updateLyricLineLock(
  projectId: number,
  lineKey: string,
  locked: boolean,
): Promise<void> {
  const project = await db.projects.get(projectId);
  if (!project?.lyrics[lineKey]) return;
  const updatedLyrics = { ...project.lyrics };
  updatedLyrics[lineKey] = { ...updatedLyrics[lineKey]!, locked };

  await db.projects.update(projectId, {
    lyrics: updatedLyrics,
  });
}

export async function updateAllLyrics(
  projectId: number,
  lyrics: Record<string, LyricLine>,
): Promise<void> {
  await db.projects.update(projectId, {
    lyrics,
  });
}

export async function updateProjectProgress(
  projectId: number,
  progress: number,
  status: ProjectStatus,
): Promise<void> {
  await db.projects.update(projectId, {
    progress,
    status,
    updatedAt: Date.now(),
  });
}

export async function updateProjectAudio(
  projectId: number,
  audioUrl: string | undefined,
  syncOffsetMs: number | undefined,
): Promise<void> {
  const updates: { updatedAt: number; audioUrl?: string; syncOffsetMs?: number } = { updatedAt: Date.now() };
  if (audioUrl !== undefined) updates.audioUrl = audioUrl;
  if (syncOffsetMs !== undefined) updates.syncOffsetMs = syncOffsetMs;
  await db.projects.update(projectId, updates);
}

export async function deleteProject(id: number): Promise<void> {
  await db.projects.delete(id);
}
