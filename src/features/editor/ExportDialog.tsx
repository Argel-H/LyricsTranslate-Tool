import { Download, FileText } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onDownload: (format: "lrc" | "srt", useTranslation: boolean) => void;
}

export function ExportDialog({ open, onClose, onDownload }: ExportDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
        <h3 className="font-title-lg text-on-surface mb-2">Export Lyrics</h3>
        <p className="font-body-md text-on-surface-variant mb-6">
          Choose format and language to download.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => onDownload("lrc", false)}
            className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
          >
            <FileText className="size-6 text-primary" />
            <span className="font-label-lg text-on-surface">LRC</span>
            <span className="font-label-md text-on-surface-variant">Original</span>
          </button>
          <button
            onClick={() => onDownload("lrc", true)}
            className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
          >
            <FileText className="size-6 text-tertiary" />
            <span className="font-label-lg text-on-surface">LRC</span>
            <span className="font-label-md text-on-surface-variant">Translated</span>
          </button>
          <button
            onClick={() => onDownload("srt", false)}
            className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
          >
            <Download className="size-6 text-primary" />
            <span className="font-label-lg text-on-surface">SRT</span>
            <span className="font-label-md text-on-surface-variant">Original</span>
          </button>
          <button
            onClick={() => onDownload("srt", true)}
            className="flex flex-col items-center gap-2 p-4 bg-surface-container rounded-2xl border border-outline-variant/20 hover:bg-surface-container-highest transition-colors"
          >
            <Download className="size-6 text-tertiary" />
            <span className="font-label-lg text-on-surface">SRT</span>
            <span className="font-label-md text-on-surface-variant">Translated</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
