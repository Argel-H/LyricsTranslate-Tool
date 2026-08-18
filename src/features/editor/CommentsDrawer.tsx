import { useEffect, useState } from "react";
import { Pencil, Plus, X, GripVertical, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { CommentEntry } from "@/lib/commentUtils";
import type { Note } from "@/types/project";
import type { I18nKey } from "@/i18n";
import { CommentEditor } from "./CommentEditor";
import { CommentMarkdown } from "./CommentMarkdown";

interface CommentsDrawerProps {
  open: boolean;
  entries: CommentEntry[];
  notes: Note[];
  onClose: () => void;
  onUpdateComment: (entry: CommentEntry, value: string) => void;
  onAddNote: () => Promise<number>;
  onUpdateNote: (id: number, value: string) => void;
  onDeleteNote: (id: number) => void;
  onReorderNotes: (ordered: Note[]) => void;
}

/**
 * Which item is currently being edited. Only one editor is open at a time
 * across both the line-comments list and the notes list.
 */
type EditingTarget = { type: "line"; key: string } | { type: "note"; id: number };

const drawerTransition = { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const };

interface NoteRowProps {
  note: Note;
  isEditing: boolean;
  isDragging: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  t: (key: I18nKey) => string;
}

/**
 * A single reorderable note card. Dragging is delegated to the grip handle via
 * the native HTML5 `draggable` attribute, so the browser draws its own drag
 * ghost and the card's text is never CSS-transformed (no distortion when
 * dragging or when the card resizes between editor and preview).
 */
function NoteRow({ note, isEditing, isDragging, onEdit, onSave, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, t }: NoteRowProps) {
  return (
    <li
      onDragOver={(e) => onDragOver(e, note.id)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl bg-surface-container-high border border-outline-variant/10 p-3 flex flex-col gap-2",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          draggable
          onDragStart={(e) => onDragStart(e, note.id)}
          onDragEnd={onDragEnd}
          aria-label={t("editor.dragNote")}
          title={t("editor.dragNote")}
          className="cursor-grab touch-none shrink-0 rounded-lg p-1 mt-1 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors"
        >
          <GripVertical className="size-4" />
        </button>
        {isEditing ? (
          <div className="min-w-0 flex-1">
            <CommentEditor initialValue={note.text} onSave={onSave} placeholder={t("editor.commentPlaceholder")} />
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <CommentMarkdown className="text-body-md text-on-surface-variant leading-relaxed" markdown={note.text} />
            </div>
            <div className="flex items-center shrink-0 overflow-hidden rounded-full border border-outline">
              <button
                onClick={onEdit}
                aria-label={t("common.edit")}
                title={t("common.edit")}
                className="flex h-12 w-12 items-center justify-center bg-primary-container text-on-primary-container transition-[filter] hover:brightness-110"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={onDelete}
                aria-label={t("common.delete")}
                title={t("common.delete")}
                className="flex h-12 w-12 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-error border-l border-outline"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * Right-side Material 3 drawer listing every comment in the project plus the
 * project's free-floating notes. Follows the Modal.tsx conventions:
 * AnimatePresence, backdrop click-to-close, Escape-to-close, and body scroll
 * lock while open. Only one item (line comment OR note) is editable at a time.
 */
export function CommentsDrawer({
  open,
  entries,
  notes,
  onClose,
  onUpdateComment,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onReorderNotes,
}: CommentsDrawerProps) {
  const { t } = useI18n();
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [orderedNotes, setOrderedNotes] = useState<Note[]>(notes);

  // Keep the local drag-order copy in sync whenever the persisted notes change.
  useEffect(() => {
    setOrderedNotes(notes);
  }, [notes]);

  const handleNoteDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
    setDraggingId(id);
  };

  const handleNoteDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggingId === null || draggingId === id) return;
    setOrderedNotes((prev) => {
      const from = prev.findIndex((n) => n.id === draggingId);
      const to = prev.findIndex((n) => n.id === id);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleNoteDrop = () => {
    if (draggingId !== null) onReorderNotes(orderedNotes);
    setDraggingId(null);
  };

  const handleNoteDragEnd = () => {
    setDraggingId(null);
    setOrderedNotes(notes);
  };

  // Lock body scroll while the drawer is open (same convention as Modal).
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape closes the drawer (same convention as Modal).
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // Reset editing state each time the drawer opens.
  useEffect(() => {
    if (open) setEditingTarget(null);
  }, [open]);

  const handleAddNote = async () => {
    const id = await onAddNote();
    if (id >= 0) setEditingTarget({ type: "note", id });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[250]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: drawerTransition }}
            exit={{ opacity: 0, transition: drawerTransition }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={drawerTransition}
            className="absolute right-0 top-0 bottom-0 w-[min(560px,92vw)] rounded-l-md bg-surface-container-low shadow-2xl border-l border-outline-variant/20 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                {t("editor.comments")}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {entries.length === 0 ? (
                <p className="text-center font-body-lg text-on-surface-variant py-12">
                  {t("editor.commentsEmpty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {entries.map((entry) => {
                    const isEditing =
                      editingTarget?.type === "line" &&
                      editingTarget.key === entry.key;
                    const lineLabel =
                      entry.lineNumbers.length === 1
                        ? t("editor.commentsLine").replace(
                            "%d",
                            String(entry.lineNumbers[0]),
                          )
                        : t("editor.commentsLines").replace(
                            "%s",
                            entry.lineNumbers.join(", "),
                          );

                    return (
                      <li
                        key={entry.key}
                        className="rounded-2xl bg-surface-container-high border border-outline-variant/10 p-3 flex flex-col gap-2"
                      >
                        <p className="font-label-lg text-on-surface break-words">
                          {entry.lyric}
                        </p>
                        <p className="font-label-md text-label-md text-on-surface-variant">
                          {lineLabel}
                        </p>
                        {isEditing ? (
                          <CommentEditor
                            initialValue={entry.comment}
                            onSave={(v) => {
                              if (v !== entry.comment) {
                                onUpdateComment(entry, v);
                              }
                              setEditingTarget(null);
                            }}
                            placeholder={t("editor.commentPlaceholder")}
                          />
                        ) : (
                          <>
                            <CommentMarkdown
                              className="text-body-md text-on-surface-variant leading-relaxed"
                              markdown={entry.comment}
                            />
                            <button
                              onClick={() =>
                                setEditingTarget({
                                  type: "line",
                                  key: entry.key,
                                })
                              }
                              className="self-end inline-flex h-12 items-center gap-1.5 rounded-full px-4 font-label-lg bg-primary-container text-on-primary-container transition-[filter] hover:brightness-110"
                            >
                              <Pencil className="size-4" />
                              {t("common.edit")}
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Free-floating notes section */}
              <div className="mt-6 border-t border-outline-variant/10 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-label-lg text-label-lg text-on-surface">
                    {t("editor.notes")}
                  </h3>
                  <button
                    onClick={handleAddNote}
                    className="inline-flex h-12 items-center gap-1.5 rounded-sm border border-outline px-4 font-label-lg text-on-surface-variant transition-colors hover:bg-secondary-container/30"
                  >
                    <Plus className="size-4" />
                    {t("editor.addNote")}
                  </button>
                </div>

                {notes.length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t("editor.notesEmpty")}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {orderedNotes.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        isEditing={
                          editingTarget?.type === "note" &&
                          editingTarget.id === note.id
                        }
                        isDragging={draggingId === note.id}
                        onEdit={() =>
                          setEditingTarget({ type: "note", id: note.id })
                        }
                        onSave={(v) => {
                          if (v.trim() === "") {
                            onDeleteNote(note.id);
                          } else if (v !== note.text) {
                            onUpdateNote(note.id, v);
                          }
                          setEditingTarget(null);
                        }}
                        onDelete={() => onDeleteNote(note.id)}
                        onDragStart={handleNoteDragStart}
                        onDragOver={handleNoteDragOver}
                        onDrop={handleNoteDrop}
                        onDragEnd={handleNoteDragEnd}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
