import Dexie, { type EntityTable } from "dexie";
import type { Project } from "@/types/project";

export interface ShareRecord {
  id?: number;
  projectId: number;
  shortId: string;
  createdAt: number;
  expiresAt: number;
}

export interface UserPreferences {
  id: "singleton";
  language: "en" | "es" | "pt";
  apiKeys?: Record<string, string>;
  aiProvider?: string | null;
  overwriteTranslations?: boolean; // NEW
}

export class LyricsTranslateDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  preferences!: EntityTable<UserPreferences, "id">;
  shareRecords!: EntityTable<ShareRecord, "id">;

  constructor() {
    super("LyricsTranslateDB");
    this.version(1).stores({
      projects: "id, title, artistName, status, createdAt, updatedAt",
      preferences: "id",
    });
    this.version(2).stores({
      shareRecords: "++id, projectId, expiresAt",
    });
  }
}

export const db = new LyricsTranslateDB();
