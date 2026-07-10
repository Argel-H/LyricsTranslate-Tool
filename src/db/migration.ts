// Database migration — runs on every app start. Idempotent (no-op when already migrated).
import { db } from "./database";
import { parseTimestampToMilliseconds } from "@/lib/timeUtils";

export async function migrateLyricTimestamps(): Promise<number> {
  const projects = await db.projects.toArray();
  let migratedCount = 0;

  for (const project of projects) {
    let touched = false;
    const migrated: Record<string, unknown> = {};

    for (const [key, line] of Object.entries(project.lyrics)) {
      const entry = line as unknown as Record<string, unknown>;
      const newLine: Record<string, unknown> = { ...entry };

      if (typeof newLine.time_start === "string") {
        newLine.time_start = parseTimestampToMilliseconds(newLine.time_start as string);
        touched = true;
      }
      if (typeof newLine.time_end === "string") {
        newLine.time_end = parseTimestampToMilliseconds(newLine.time_end as string);
        touched = true;
      }
      delete newLine.comment;

      migrated[key] = newLine;
    }

    if (touched) {
      await db.projects.update(project.id, { lyrics: migrated } as never);
      migratedCount++;
    }
  }

  if (migratedCount > 0) {
    console.log(
      `[migration] Converted ${migratedCount} project(s) to ms timestamps.`,
    );
  }
  return migratedCount;
}

/**
 * Fixes legacy projects where status is "in-progress" but progress is 0%.
 * These should be "not-started" under the new status model.
 */
export async function normalizeLegacyStatuses(): Promise<number> {
  const projects = await db.projects.toArray();
  let fixedCount = 0;

  for (const project of projects) {
    if (project.status === "in-progress" && project.progress === 0) {
      await db.projects.update(project.id, {
        status: "not-started" as never,
        updatedAt: Date.now(),
      });
      fixedCount++;
    }
  }

  if (fixedCount > 0) {
    console.log(
      `[migration] Normalized ${fixedCount} project(s) from in-progress→not-started.`,
    );
  }
  return fixedCount;
}
