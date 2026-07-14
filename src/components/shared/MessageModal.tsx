interface MessageModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
}

export function MessageModal({
  open,
  title,
  message,
  confirmLabel = "OK",
  onClose,
}: MessageModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
        <h3 className="font-title-lg text-on-surface mb-2">{title}</h3>
        <p className="font-body-md text-on-surface-variant mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
