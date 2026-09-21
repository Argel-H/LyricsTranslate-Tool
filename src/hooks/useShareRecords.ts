import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { createShareRecord, getShareRecordsByProject } from "@/db/shareRepository";
import type { ShareRecord } from "@/db/database";
import type { Project } from "@/types/project";
import { getShareBaseUrl } from "@/types/share";
import { useInterval } from "@/hooks/useInterval";
import { useI18n } from "@/hooks/useI18n";
import type { I18nKey } from "@/i18n";

const EXPIRATION_CHECK_MS = 30_000;

const QR_WIDTH = 160;
const QR_MARGIN = 1;

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

// Expired once `expiresAt` is reached (inclusive).
export function isExpired(record: ShareRecord): boolean {
  return record.expiresAt <= Date.now();
}

export function formatTimeLeft(
  expiresAt: number,
  t: (key: I18nKey) => string,
): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return t("share.expired");
  const days = Math.floor(diff / MS_PER_DAY);
  const hours = Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export interface UseShareRecordsResult {
  records: ShareRecord[];
  selectedRecord: ShareRecord | null;
  setSelectedRecord: (record: ShareRecord | null) => void;
  generating: boolean;
  error: string | null;
  generate: () => Promise<void>;
}

export function useShareRecords(
  project: Project,
  open: boolean,
): UseShareRecordsResult {
  const { t } = useI18n();

  const [records, setRecords] = useState<ShareRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ShareRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bump the counter to re-render without replacing the records array identity.
  const [, forceExpirationRefresh] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    getShareRecordsByProject(project.id)
      .then(setRecords)
      .catch(() => setError(t("share.error")));
  }, [open, project.id, t]);

  // A null delay pauses the interval while the dialog is closed.
  useInterval(
    () => forceExpirationRefresh((n) => n + 1),
    open ? EXPIRATION_CHECK_MS : null,
  );

  const generate = useCallback(async (): Promise<void> => {
    setGenerating(true);
    setError(null);
    try {
      const { createShortShareUrl } = await import("@/lib/share/shareProtocol");
      const shortId = await createShortShareUrl(project);
      await createShareRecord(project.id, shortId);

      const updated = await getShareRecordsByProject(project.id);
      setRecords(updated);
      const newest = updated.find((r) => r.shortId === shortId);
      if (newest) {
        setSelectedRecord(newest);
      }
    } catch {
      setError(t("share.error"));
    } finally {
      setGenerating(false);
    }
  }, [project, t]);

  return {
    records,
    selectedRecord,
    setSelectedRecord,
    generating,
    error,
    generate,
  };
}

// In-flight generation is cancelled on record change or unmount, so a stale
// QR image can never flash on screen.
export function useShareQrCode(record: ShareRecord | null): string | null {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!record) {
      setQrDataUrl(null);
      return;
    }

    const fullUrl = getShareBaseUrl() + record.shortId;
    let cancelled = false;

    QRCode.toDataURL(fullUrl, { width: QR_WIDTH, margin: QR_MARGIN })
      .then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [record]);

  return qrDataUrl;
}
