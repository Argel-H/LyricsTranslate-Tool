import Dexie, { type EntityTable } from "dexie";
import type { Project } from "@/types/project";

export interface UserPreferences {
  id: "singleton";
  language: "en" | "es" | "pt";
}

export class LyricsTranslateDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  preferences!: EntityTable<UserPreferences, "id">;

  constructor() {
    super("LyricsTranslateDB");
    this.version(1).stores({
      projects: "id, title, artistName, status, createdAt, updatedAt",
      preferences: "id",
    });
  }
}

export const db = new LyricsTranslateDB();
