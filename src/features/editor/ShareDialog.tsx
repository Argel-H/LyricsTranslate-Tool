import { useRef } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Share2, Copy, Eye, Check, Loader2, X } from "lucide-react";
import type { Project } from "@/types/project";
import { getShareBaseUrl } from "@/types/share";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  useShareRecords,
  useShareQrCode,
  isExpired,
  formatTimeLeft,
  formatDate,
} from "@/hooks/useShareRecords";

interface ShareDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
}

const COPY_FEEDBACK_MS = 2_000;

export function ShareDialog({ open, project, onClose }: ShareDialogProps) {
  const { t } = useI18n();

  const popupRef = useRef<HTMLDivElement>(null);
  useClickOutside(popupRef, onClose, open);

  useEscapeKey(open, onClose);

  const {
    records,
    selectedRecord,
    setSelectedRecord,
    generating,
    error,
    generate,
  } = useShareRecords(project, open);

  const qrDataUrl = useShareQrCode(selectedRecord);

  const { copy, copied } = useCopyToClipboard({ feedbackMs: COPY_FEEDBACK_MS });

  const handleCopy = (shortId: string) => {
    void copy(getShareBaseUrl() + shortId);
  };

  if (!open) return null;

  return (
    <div
      className="fixed top-[72px] right-4 z-[200] bg-surface-container-high rounded-3xl shadow-2xl border border-outline-variant/20 w-[340px] max-h-[80vh] flex flex-col"
      ref={popupRef}
    >
      <div className="absolute -top-2 right-[52px] w-4 h-4 bg-surface-container-high border-l border-t border-outline-variant/20 rotate-45" />
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

        <div className="px-6 pt-5 pb-2">
          <button
            onClick={generate}
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

        <div className="px-6 py-3 border-b border-outline-variant/20">
          <span className="font-label-md text-on-surface-variant">
            {t("share.history")}
          </span>
        </div>

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
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      expired ? "bg-error" : "bg-green-400"
                    }`}
                  />

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

                  {!expired && (
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                      title={t("share.view")}
                    >
                      <Eye className="size-4" />
                    </button>
                  )}

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
