import { db } from "@/db/database";
import type { Project } from "@/types/project";
import type { UserPreferences } from "@/db/database";

const BACKUP_VERSION = 1;

interface DatabaseBackup {
  version: number;
  exportedAt: string;
  projects: Project[];
  preferences: UserPreferences | null;
}

/**
 * Exports the entire database (projects + preferences) as a downloadable JSON file.
 */
export async function exportDatabase(): Promise<void> {
  const [projects, preferences] = await Promise.all([
    db.projects.toArray(),
    db.preferences.get("singleton"),
  ]);

  const backup: DatabaseBackup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    preferences: preferences ?? null,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `lyricstranslate-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates and imports a database backup JSON file.
 * Replaces ALL existing data in an atomic transaction.
 * Throws on invalid data (transaction is rolled back automatically).
 */
export async function importDatabase(
  file: File,
): Promise<{ projectCount: number }> {
  const text = await file.text();

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!data || typeof data !== "object") {
    throw new Error("INVALID_FORMAT");
  }

  const backup = data as Record<string, unknown>;

  // Validate projects array
  if (!Array.isArray(backup.projects)) {
    throw new Error("MISSING_PROJECTS");
  }

  const projects = backup.projects as Project[];
  const preferences = (backup.preferences as UserPreferences | null) ?? null;

  // Basic validation of each project
  for (const p of projects) {
    if (typeof p.id !== "number" || typeof p.title !== "string") {
      throw new Error("INVALID_PROJECT");
    }
  }

  // Atomic transaction: clear + bulk import
  await db.transaction("rw", db.projects, db.preferences, async () => {
    await db.projects.clear();
    await db.preferences.clear();

    if (projects.length > 0) {
      await db.projects.bulkAdd(projects);
    }
    if (preferences) {
      await db.preferences.put(preferences);
    }
  });

  return { projectCount: projects.length };
}
