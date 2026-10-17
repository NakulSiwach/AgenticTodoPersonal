"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { addDays, formatLongDate, nextWeekday, REPEAT_LABELS } from "@/lib/dates";
import { isReadable, HIGHLIGHT_COLORS, TEXT_COLORS } from "@/lib/palette";
import { listNameSchema, notesSchema, tagSchema, titleSchema } from "@/lib/schema";
import {
  HIGHLIGHT_COLOR_KEYS,
  REPEATS,
  TEXT_COLOR_KEYS,
  type HighlightKey,
  type Priority,
  type Repeat,
  type Subtask,
  type TextColorKey,
  type Todo,
  type TodoPatch,
} from "@/lib/types";
import { QUICK_TAGS } from "@/lib/options";
import { ColorPicker } from "./ColorPicker";
import { Dropdown, type DropdownOption } from "./Dropdown";
import { PriorityPicker } from "./PriorityPicker";

type Props = {
  todo: Todo;
  today: string;
  /** Existing list names, offered as suggestions. */
  lists: string[];
  onSave: (patch: TodoPatch) => void;
  onDelete: () => void;
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';
const field =
  "min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-950";
const label = "mb-1 block text-sm font-medium";
const quick =
  "min-h-9 rounded-full border px-3 text-xs font-medium border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 aria-pressed:border-indigo-600 aria-pressed:bg-indigo-600/10 aria-pressed:text-indigo-700 dark:aria-pressed:border-indigo-400 dark:aria-pressed:text-indigo-300";

const REPEAT_OPTIONS: DropdownOption<string>[] = [
  { value: "", label: "Doesn't repeat" },
  ...REPEATS.map((r) => ({ value: r, label: REPEAT_LABELS[r] })),
];

/** Mount with a `key` of the todo id so the form state resets per todo. */
export function EditSheet({ todo, today, lists, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes ?? "");
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [textColor, setTextColor] = useState<TextColorKey | null>(todo.text_color);
  const [highlight, setHighlight] = useState<HighlightKey | null>(todo.highlight_color);
  const [due, setDue] = useState<string | null>(todo.due_date);
  const [repeat, setRepeat] = useState<Repeat | null>(todo.repeat);
  const [list, setList] = useState(todo.list_name ?? "");
  const [tags, setTags] = useState<string[]>(todo.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>(todo.subtasks);
  const [subDraft, setSubDraft] = useState("");
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

  const addTag = (raw: string): boolean => {
    const value = raw.trim().replace(/^@/, "");
    if (!value) return true;
    const parsed = tagSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid tag");
      return false;
    }
    if (tags.length >= 10) {
      setError("At most 10 tags");
      return false;
    }
    setError(null);
    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value],
    );
    setTagDraft("");
    return true;
  };

  const withSubDraft = (): Subtask[] => {
    const t = subDraft.trim();
    return t ? [...subtasks, { id: crypto.randomUUID(), title: t, done: false }] : subtasks;
  };

  const addSubtask = () => {
    const parsed = titleSchema.safeParse(subDraft);
    if (!subDraft.trim()) return;
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid subtask");
    if (subtasks.length >= 50) return setError("At most 50 subtasks");
    setError(null);
    setSubtasks(withSubDraft());
    setSubDraft("");
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const t = titleSchema.safeParse(title);
    if (!t.success) return setError(t.error.issues[0]?.message ?? "Invalid title");
    const n = notesSchema.safeParse(notes.trim() === "" ? null : notes);
    if (!n.success) return setError(n.error.issues[0]?.message ?? "Invalid notes");
    const l = listNameSchema.safeParse(list.trim() === "" ? null : list);
    if (!l.success) return setError("List name must be 1–40 characters");
    const finalTags = [...tags];
    const pendingTag = tagDraft.trim().replace(/^@/, "");
    if (pendingTag && !finalTags.some((x) => x.toLowerCase() === pendingTag.toLowerCase())) {
      const p = tagSchema.safeParse(pendingTag);
      if (!p.success) return setError(p.error.issues[0]?.message ?? "Invalid tag");
      if (finalTags.length >= 10) return setError("At most 10 tags");
      finalTags.push(p.data);
    }
    const finalSubtasks = withSubDraft();
    if (finalSubtasks.length > 50) return setError("At most 50 subtasks");
    onSave({
      title: t.data,
      notes: n.data,
      priority,
      text_color: textColor,
      highlight_color: highlight,
      due_date: due,
      repeat: due ? repeat : null,
      list_name: l.data,
      tags: finalTags,
      subtasks: finalSubtasks,
    });
  };

  const previewClasses = [
    "box-decoration-clone rounded px-1 py-0.5 break-words",
    textColor ? TEXT_COLORS[textColor] : "",
    highlight ? HIGHLIGHT_COLORS[highlight] : "",
  ].join(" ");

  const tomorrow = addDays(today, 1);
  const nextWeek = nextWeekday(today, 1);
  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end"
      onKeyDown={onKeyDown}
    >
      <div className="anim-fade absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit todo"
        className="anim-sheet relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl md:max-h-none md:max-w-md md:rounded-none md:rounded-l-2xl dark:bg-neutral-900"
      >
        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Task details</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-11 place-items-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
            <div>
              <label htmlFor="edit-title" className={label}>
                Title
              </label>
              <input
                id="edit-title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="edit-notes" className={label}>
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
              <label htmlFor="edit-due" className={label}>
                Due date
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick dates">
                <button type="button" className={quick} aria-pressed={due === today} onClick={() => setDue(today)}>
                  Today
                </button>
                <button type="button" className={quick} aria-pressed={due === tomorrow} onClick={() => setDue(tomorrow)}>
                  Tomorrow
                </button>
                <button type="button" className={quick} aria-pressed={due === nextWeek} onClick={() => setDue(nextWeek)}>
                  Next week
                </button>
                <button type="button" className={quick} aria-pressed={due === null} onClick={() => setDue(null)}>
                  No date
                </button>
              </div>
              <input
                id="edit-due"
                type="date"
                value={due ?? ""}
                onChange={(e) => setDue(e.target.value || null)}
                className={field}
              />
              {due && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{formatLongDate(due)}</p>}
            </div>

            <div>
              <p className={label}>Repeat</p>
              <Dropdown
                label="Repeat"
                title="Repeat"
                value={repeat ?? ""}
                options={REPEAT_OPTIONS}
                onChange={(v) => {
                  const next = (v || null) as Repeat | null;
                  setRepeat(next);
                  if (next && !due) setDue(today);
                }}
                className={`${field} flex items-center justify-between gap-2 text-left`}
              >
                <span>{repeat ? REPEAT_LABELS[repeat] : "Doesn't repeat"}</span>
                <ChevronDown size={16} aria-hidden="true" className="text-neutral-500" />
              </Dropdown>
            </div>

            <div>
              <p className={label}>Priority</p>
              <PriorityPicker value={priority} onChange={setPriority} />
            </div>

            <div>
              <label htmlFor="edit-list" className={label}>
                List
              </label>
              <input
                id="edit-list"
                value={list}
                maxLength={40}
                placeholder="Inbox"
                onChange={(e) => setList(e.target.value)}
                className={field}
              />
              <div role="group" aria-label="Pick a list" className="mt-2 flex flex-wrap gap-1.5">
                {["", ...lists].map((l) => (
                  <button
                    key={l || "inbox"}
                    type="button"
                    aria-pressed={list.trim().toLowerCase() === l.toLowerCase()}
                    onClick={() => setList(l)}
                    className={quick}
                  >
                    {l || "Inbox"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="edit-tags" className={label}>
                Tags
              </label>
              <div role="group" aria-label="Quick tags" className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((q) => {
                  const on = tags.some((t) => t.toLowerCase() === q.toLowerCase());
                  return (
                    <button
                      key={q}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setTags((prev) =>
                          on
                            ? prev.filter((t) => t.toLowerCase() !== q.toLowerCase())
                            : prev.length >= 10
                              ? prev
                              : [...prev, q],
                        )
                      }
                      className={quick}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
              {tags.length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <li
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-200 py-1 pr-1 pl-3 text-xs dark:bg-neutral-800"
                    >
                      @{t}
                      <button
                        type="button"
                        aria-label={`Remove tag ${t}`}
                        onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                        className="grid size-6 place-items-center rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700"
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                id="edit-tags"
                value={tagDraft}
                maxLength={31}
                placeholder="Type a tag, press Enter"
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagDraft);
                  }
                }}
                className={field}
              />
            </div>

            <div>
              <p className={label}>
                Subtasks{" "}
                {subtasks.length > 0 && (
                  <span className="font-normal text-neutral-500 dark:text-neutral-400">
                    ({doneCount}/{subtasks.length})
                  </span>
                )}
              </p>
              {subtasks.length > 0 && (
                <ul className="mb-2">
                  {subtasks.map((s) => (
                    <li key={s.id} className="flex items-center gap-1">
                      <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
                        <input
                          type="checkbox"
                          checked={s.done}
                          aria-label={`Subtask done: ${s.title}`}
                          onChange={() =>
                            setSubtasks((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)),
                            )
                          }
                          className="size-5 cursor-pointer accent-indigo-600"
                        />
                      </label>
                      <span className={`min-w-0 flex-1 break-words text-sm ${s.done ? "text-neutral-500 line-through" : ""}`}>
                        {s.title}
                      </span>
                      <button
                        type="button"
                        aria-label={`Delete subtask ${s.title}`}
                        onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== s.id))}
                        className="grid size-11 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  aria-label="New subtask"
                  value={subDraft}
                  maxLength={200}
                  placeholder="Add a subtask"
                  onChange={(e) => setSubDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                  className={field}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  aria-label="Add subtask"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-200 dark:bg-neutral-800"
                >
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <p className={label}>Text color</p>
              <ColorPicker kind="text" value={textColor} onChange={setTextColor} disabledKeys={disabledTextKeys} />
            </div>
            <div>
              <p className={label}>Highlight</p>
              <ColorPicker kind="highlight" value={highlight} onChange={setHighlight} disabledKeys={disabledHighlightKeys} />
            </div>
            <p aria-label="Preview" className="rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
              <span className={previewClasses}>{title.trim() || "Preview"}</span>
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 border-t border-neutral-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
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
              className="min-h-11 flex-1 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
