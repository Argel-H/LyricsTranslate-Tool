import { db, type ShareRecord } from "./database";

const EXPIRATION_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export async function createShareRecord(projectId: number, shortId: string): Promise<number> {
  const now = Date.now();
  const id = await db.shareRecords.add({
    projectId,
    shortId,
    createdAt: now,
    expiresAt: now + EXPIRATION_DAYS * MS_PER_DAY,
  });
  // Dexie auto-generates the key; id is always defined when add() succeeds
  return id!;
}

export function getShareRecordsByProject(projectId: number): Promise<ShareRecord[]> {
  return db.shareRecords
    .where("projectId")
    .equals(projectId)
    .reverse()
    .sortBy("createdAt");
}

export function deleteExpiredShareRecords(): Promise<number> {
  return db.shareRecords
    .where("expiresAt")
    .below(Date.now())
    .delete();
}

export function deleteShareRecordsByProject(projectId: number): Promise<number> {
  return db.shareRecords.where("projectId").equals(projectId).delete();
}
