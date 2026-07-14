import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/hooks/useI18n";
import { Share2, Copy, Eye, Check, Loader2, X } from "lucide-react";
import { createShareRecord, getShareRecordsByProject } from "@/db/shareRepository";
import type { ShareRecord } from "@/db/database";
import { createShortShareUrl } from "@/lib/share/shareProtocol";
import type { Project } from "@/types/project";
import { getShareBaseUrl } from "@/types/share";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { I18nKey } from "@/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShareDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXPIRATION_CHECK_MS = 30_000; // 30s
const COPY_FEEDBACK_MS = 2_000;

/**
 * Formats the remaining time until expiration into a human-readable string.
 * Returns the i18n "expired" label when the timestamp is in the past.
 */
function formatTimeLeft(expiresAt: number, t: (key: I18nKey) => string): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return t("share.expired");
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

function isExpired(record: ShareRecord): boolean {
  return record.expiresAt <= Date.now();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareDialog({ open, project, onClose }: ShareDialogProps) {
  const { t } = useI18n();

  // ---- state -----------------------------------------------------------
  const [generating, setGenerating] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ShareRecord | null>(null);
  const [records, setRecords] = useState<ShareRecord[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popupRef = useRef<HTMLDivElement>(null);
  useClickOutside(popupRef, onClose, open);

  // ---- fetch records on open -------------------------------------------
  useEffect(() => {
    if (!open) return;
    setError(null);
    getShareRecordsByProject(project.id)
      .then(setRecords)
      .catch(() => setError(t("share.error")));
  }, [open, project.id, t]);

  // ---- auto-refresh expiration states ----------------------------------
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      // Force re-render so formatTimeLeft / isExpired update
      setRecords((prev) => [...prev]);
    }, EXPIRATION_CHECK_MS);
    return () => clearInterval(id);
  }, [open]);

  // ---- generate QR when selectedRecord changes -------------------------
  useEffect(() => {
    if (!selectedRecord) {
      setQrDataUrl(null);
      return;
    }
    const fullUrl = getShareBaseUrl() + selectedRecord.shortId;
    let cancelled = false;
    QRCode.toDataURL(fullUrl, { width: 160, margin: 1 })
      .then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRecord]);

  // ---- generate a new share link ---------------------------------------
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
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
  };

  // ---- copy to clipboard -----------------------------------------------
  const handleCopy = async (shortId: string) => {
    const fullUrl = getShareBaseUrl() + shortId;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // clipboard write may fail in non-secure contexts
    }
  };

  // ---- early exit if closed --------------------------------------------
  if (!open) return null;

  // ---- render ----------------------------------------------------------
  return (
    <div
      className="fixed top-[72px] right-4 z-[200] bg-surface-container-high rounded-3xl shadow-2xl border border-outline-variant/20 w-[340px] max-h-[80vh] flex flex-col"
      ref={popupRef}
    >
      {/* Pointer arrow */}
      <div className="absolute -top-2 right-[52px] w-4 h-4 bg-surface-container-high border-l border-t border-outline-variant/20 rotate-45" />
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
          <h2 className="font-title-lg text-on-surface flex items-center gap-2">
            <Share2 className="size-5" />
            {t("share.title")}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Generate Button ──────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 bg-primary-container text-on-primary-container rounded-full font-label-lg hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Share2 className="size-4" />
            )}
            {t("share.generate")}
          </button>
          {error && (
            <p className="mt-2 text-center text-label-sm text-error">{error}</p>
          )}
        </div>

        {/* ── QR + Copy section (visible when a record is selected) ── */}
        {selectedRecord && qrDataUrl && (
          <div className="px-6 py-4 flex flex-col items-center gap-3 border-b border-outline-variant/20">
            <div className="bg-white p-3 rounded-2xl">
              <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
            </div>

            <button
              onClick={() => handleCopy(selectedRecord.shortId)}
              className="text-sm text-on-surface-variant hover:text-primary transition-colors font-label-md flex items-center gap-1"
            >
              {getShareBaseUrl()}{selectedRecord.shortId}
              {copied ? (
                <Check className="size-3.5 text-green-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>

            <span className="text-xs text-on-surface-variant">
              {isExpired(selectedRecord)
                ? t("share.expired")
                : `${t("share.expiresIn")} ${formatTimeLeft(selectedRecord.expiresAt, t)}`}
            </span>
          </div>
        )}

        {/* ── History Header ───────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-outline-variant/20">
          <span className="font-label-md text-on-surface-variant">
            {t("share.history")}
          </span>
        </div>

        {/* ── Record List ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {records.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant font-body-md">
              {t("share.noLinks")}
            </p>
          ) : (
            records.map((record) => {
              const expired = isExpired(record);
              const isSelected = selectedRecord?.id === record.id;
              return (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                    isSelected
                      ? "bg-primary-container/30"
                      : "hover:bg-surface-container-highest"
                  }`}
                >
                  {/* Status dot */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      expired ? "bg-error" : "bg-green-400"
                    }`}
                  />

                  {/* Info column */}
                  <div className="flex-1 min-w-0">
                    <span className="font-body-md text-on-surface block truncate">
                      {formatDate(record.createdAt)}
                    </span>
                    <span className="font-label-sm text-on-surface-variant">
                      {expired
                        ? t("share.expired")
                        : formatTimeLeft(record.expiresAt, t)}
                    </span>
                  </div>

                  {/* View (QR) button — hidden for expired links */}
                  {!expired && (
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                      title={t("share.view")}
                    >
                      <Eye className="size-4" />
                    </button>
                  )}

                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(record.shortId)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                    title={t("share.copy")}
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
    </div>
  );
}
