import type { ProjectCreateInput } from "@/types/project";

const cache = new Map<string, ProjectCreateInput>();

export function setCachedProject(key: string, project: ProjectCreateInput): void {
  cache.set(key, project);
}

export function getCachedProject(key: string): ProjectCreateInput | undefined {
  return cache.get(key);
}
