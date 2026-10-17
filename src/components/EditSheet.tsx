"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isReadable, HIGHLIGHT_COLORS, TEXT_COLORS } from "@/lib/palette";
import { notesSchema, titleSchema } from "@/lib/schema";
import {
  HIGHLIGHT_COLOR_KEYS,
  TEXT_COLOR_KEYS,
  type HighlightKey,
  type Priority,
  type TextColorKey,
  type Todo,
  type TodoPatch,
} from "@/lib/types";
import { ColorPicker } from "./ColorPicker";
import { PriorityPicker } from "./PriorityPicker";

type Props = {
  todo: Todo;
  onSave: (patch: TodoPatch) => void;
  onDelete: () => void;
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

/** Mount with a `key` of the todo id so the form state resets per todo. */
export function EditSheet({ todo, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes ?? "");
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [textColor, setTextColor] = useState<TextColorKey | null>(todo.text_color);
  const [highlight, setHighlight] = useState<HighlightKey | null>(todo.highlight_color);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const disabledTextKeys = useMemo(
    () => TEXT_COLOR_KEYS.filter((k) => !isReadable(k, highlight)),
    [highlight],
  );
  const disabledHighlightKeys = useMemo(
    () => HIGHLIGHT_COLOR_KEYS.filter((k) => !isReadable(textColor, k)),
    [textColor],
  );

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const t = titleSchema.safeParse(title);
    if (!t.success) return setError(t.error.issues[0]?.message ?? "Invalid title");
    const n = notesSchema.safeParse(notes.trim() === "" ? null : notes);
    if (!n.success) return setError(n.error.issues[0]?.message ?? "Invalid notes");
    onSave({
      title: t.data,
      notes: n.data,
      priority,
      text_color: textColor,
      highlight_color: highlight,
    });
  };

  const previewClasses = [
    "box-decoration-clone rounded px-1 py-0.5 break-words",
    textColor ? TEXT_COLORS[textColor] : "",
    highlight ? HIGHLIGHT_COLORS[highlight] : "",
  ].join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit todo"
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900"
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="mb-1 block text-sm font-medium">
              Title
            </label>
            <input
              id="edit-title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>
          <div>
            <label htmlFor="edit-notes" className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              maxLength={2000}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-base dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Priority</p>
            <PriorityPicker value={priority} onChange={setPriority} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Text color</p>
            <ColorPicker
              kind="text"
              value={textColor}
              onChange={setTextColor}
              disabledKeys={disabledTextKeys}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Highlight</p>
            <ColorPicker
              kind="highlight"
              value={highlight}
              onChange={setHighlight}
              disabledKeys={disabledHighlightKeys}
            />
          </div>
          <p aria-label="Preview" className="rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
            <span className={previewClasses}>{title.trim() || "Preview"}</span>
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="min-h-11 rounded-xl border border-red-600 px-4 font-semibold text-red-600 dark:border-red-400 dark:text-red-400"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 flex-1 rounded-xl bg-neutral-200 font-semibold dark:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-11 flex-1 rounded-xl bg-indigo-600 font-semibold text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
