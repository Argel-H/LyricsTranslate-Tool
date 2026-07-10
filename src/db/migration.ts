// TEMPORARY FILE — safe to delete after all users have migrated their DB.
// Converts string timestamps ("MM:SS.xx") to milliseconds (number) and removes
// the unused `comment` field from all stored lyric lines.
import { db } from "./database";

function parseTimestampToMs(ts: string): number {
  const [minSec, csRaw = "0"] = ts.split(".");
  const [min = "0", sec = "0"] = minSec.split(":");
  return (parseInt(min) * 60 + parseInt(sec)) * 1000 + parseInt(csRaw.padEnd(2, "0")) * 10;
}

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
        newLine.time_start = parseTimestampToMs(newLine.time_start as string);
        touched = true;
      }
      if (typeof newLine.time_end === "string") {
        newLine.time_end = parseTimestampToMs(newLine.time_end as string);
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
