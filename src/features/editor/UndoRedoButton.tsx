import { cn } from "@/lib/utils";
import { Undo2, Redo2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface UndoRedoButtonProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export function UndoRedoButton({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
}: UndoRedoButtonProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "flex rounded-l-lg rounded-r-lg overflow-hidden border border-outline h-12",
        className,
      )}
    >
      {/* Undo segment */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title={t("editor.undoTooltip")}
        className={cn(
          "flex items-center justify-center gap-1.5 px-3 font-label-lg transition-all duration-200 pressable",
          "flex-1 text-on-surface hover:bg-secondary-container/30",
          "border-r border-outline",
          !canUndo && "opacity-40 pointer-events-none",
        )}
      >
        <Undo2 className="size-4 shrink-0" />
        <span className="hidden sm:inline">{t("editor.undoTooltip")}</span>
      </button>

      {/* Redo segment */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title={t("editor.redoTooltip")}
        className={cn(
          "flex items-center justify-center gap-1.5 px-3 font-label-lg transition-all duration-200 pressable",
          "flex-1 text-on-surface hover:bg-secondary-container/30",
          !canRedo && "opacity-40 pointer-events-none",
        )}
      >
        <Redo2 className="size-4 shrink-0" />
        <span className="hidden sm:inline">{t("editor.redoTooltip")}</span>
      </button>
    </div>
  );
}
