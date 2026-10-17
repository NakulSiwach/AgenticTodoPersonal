"use client";

import { forwardRef, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, CircleHelp, Flag, Hash, Plus, Tag } from "lucide-react";
import { addDays, formatDue, REPEAT_LABELS } from "@/lib/dates";
import { priorityOptions, QUICK_TAGS } from "@/lib/options";
import { PRIORITY_STYLES } from "@/lib/palette";
import { parseQuickAdd } from "@/lib/quickadd";
import { titleSchema } from "@/lib/schema";
import type { NewTodo, Priority } from "@/lib/types";
import { Dropdown, type DropdownOption } from "./Dropdown";

export type ComposerInput = Omit<NewTodo, "id">;

type Props = {
  onAdd: (input: ComposerInput) => void;
  today: string;
  /** Used when the typed text doesn't set them (e.g. inside a list or the Today view). */
  defaultDue: string | null;
  defaultList: string | null;
  lists: string[];
  /** Tags already used on other tasks, offered next to the built-in quick tags. */
  knownTags: string[];
};

const chip =
  "relative inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors";
const chipOff =
  "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";
const chipOn =
  "border-indigo-600 bg-indigo-600/10 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const TIPS: { what: string; how: string; example: string }[] = [
  { what: "Date", how: "today, tomorrow, friday, in 3 days, next week", example: "Call mom tomorrow" },
  { what: "Priority", how: "!0 to !4 (or p0 to p4). P0 is most urgent, P4 is lowest", example: "Fix bug !0" },
  { what: "List", how: "#ListName puts the task in that list", example: "Buy milk #Home" },
  { what: "Tag", how: "@tag adds a label. You can add several", example: "Report @office @urgent" },
  { what: "Repeat", how: "every day, every weekday, every week, every month, every monday", example: "Gym every monday" },
];

export const Composer = forwardRef<HTMLInputElement, Props>(function Composer(
  { onAdd, today, defaultDue, defaultList, lists, knownTags },
  inputRef,
) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(2);
  const [due, setDue] = useState<string | null>(null);
  const [list, setList] = useState<string | null>(null);
  const [pickedTags, setPickedTags] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseQuickAdd(title, today), [title, today]);
  const effectiveDue = parsed.due_date ?? due ?? defaultDue;
  const effectiveList = parsed.list_name ?? list ?? defaultList;
  const effectivePriority = parsed.priority ?? priority;
  const effectiveTags = useMemo(() => {
    const out = [...parsed.tags];
    for (const t of pickedTags) if (!out.some((x) => same(x, t))) out.push(t);
    return out.slice(0, 10);
  }, [parsed.tags, pickedTags]);
  const tomorrow = addDays(today, 1);

  const tagChoices = useMemo(() => {
    const extra = knownTags.filter((t) => !QUICK_TAGS.some((q) => same(q, t))).slice(0, 4);
    return [...QUICK_TAGS, ...extra];
  }, [knownTags]);

  const toggleTag = (tag: string) => {
    if (parsed.tags.some((t) => same(t, tag))) {
      // The tag was typed as @tag: remove it from the text so the chip really turns off.
      setTitle((prev) => prev.replace(new RegExp(`(^|\\s)@${escapeRe(tag)}(?=\\s|$)`, "i"), "$1").trim());
    }
    setPickedTags((prev) => (prev.some((t) => same(t, tag)) ? prev.filter((t) => !same(t, tag)) : [...prev, tag]));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = titleSchema.safeParse(parsed.title);
    if (!t.success) {
      setError(t.error.issues[0]?.message ?? "Invalid title");
      return;
    }
    setError(null);
    onAdd({
      title: t.data,
      priority: effectivePriority,
      ...(effectiveDue ? { due_date: effectiveDue } : {}),
      ...(effectiveList ? { list_name: effectiveList } : {}),
      ...(effectiveTags.length ? { tags: effectiveTags } : {}),
      ...(parsed.repeat ? { repeat: parsed.repeat } : {}),
    });
    setTitle("");
    setDue(null);
    setPickedTags([]);
  };

  const listOptions: DropdownOption<string>[] = [
    { value: "", label: "Inbox" },
    ...Array.from(new Set([...(effectiveList ? [effectiveList] : []), ...lists])).map((l) => ({
      value: l,
      label: l,
    })),
  ];
  const hasTokens =
    parsed.due_date || parsed.priority !== undefined || parsed.list_name || parsed.tags.length || parsed.repeat;
  const customDate = effectiveDue && effectiveDue !== today && effectiveDue !== tomorrow;

  return (
    <form
      onSubmit={submit}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:z-auto md:mb-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <div className="mx-auto max-w-3xl space-y-2 md:rounded-2xl md:border md:border-neutral-200 md:bg-white md:p-3 md:shadow-sm dark:md:border-neutral-800 dark:md:bg-neutral-900">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <label className="sr-only" htmlFor="new-todo">
              New todo
            </label>
            <input
              id="new-todo"
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoComplete="off"
              placeholder="Add a task…"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "new-todo-error" : "new-todo-hint"}
              className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white pr-11 pl-3 text-base placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="button"
              onClick={() => setShowTips((v) => !v)}
              aria-expanded={showTips}
              aria-controls="quick-add-tips"
              aria-label="Quick-add tips"
              title="Quick-add tips"
              className={`absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                showTips ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"
              }`}
            >
              <CircleHelp size={18} aria-hidden="true" />
            </button>
          </div>
          <button
            type="submit"
            aria-label="Add"
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 sm:px-5"
          >
            <Plus size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
        <p id="new-todo-hint" className="hidden px-1 text-xs text-neutral-500 md:block dark:text-neutral-400">
          Type naturally:{" "}
          <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">tomorrow</kbd>{" "}
          <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">!1</kbd> priority{" "}
          <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">#list</kbd>{" "}
          <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">@tag</kbd>{" "}
          <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">every week</kbd>
          {" · "}
          <button type="button" onClick={() => setShowTips(true)} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            See all tips
          </button>
        </p>
        {showTips && (
          <div
            id="quick-add-tips"
            className="max-h-[40dvh] space-y-2 overflow-y-auto rounded-xl bg-indigo-50 p-3 text-sm dark:bg-indigo-950/40"
          >
            <p className="font-semibold">Type these words in the box and TaskFlow fills in the details:</p>
            <dl className="space-y-1.5">
              {TIPS.map((t) => (
                <div key={t.what} className="flex flex-col sm:flex-row sm:gap-3">
                  <dt className="w-16 shrink-0 font-medium">{t.what}</dt>
                  <dd className="text-neutral-700 dark:text-neutral-300">
                    {t.how}
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">e.g. {t.example}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Or use the buttons below. Typed words win over the buttons.
            </p>
          </div>
        )}
        {error && (
          <p id="new-todo-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {hasTokens && (
          <p aria-live="polite" className="flex flex-wrap gap-1.5 text-xs text-indigo-700 dark:text-indigo-300">
            <span className="sr-only">Detected:</span>
            {parsed.due_date && <span className="rounded-full bg-indigo-600/10 px-2 py-0.5">{formatDue(parsed.due_date, today).label}</span>}
            {parsed.repeat && <span className="rounded-full bg-indigo-600/10 px-2 py-0.5">{REPEAT_LABELS[parsed.repeat]}</span>}
            {parsed.priority !== undefined && <span className="rounded-full bg-indigo-600/10 px-2 py-0.5">P{parsed.priority}</span>}
            {parsed.list_name && <span className="rounded-full bg-indigo-600/10 px-2 py-0.5">#{parsed.list_name}</span>}
            {parsed.tags.map((t) => <span key={t} className="rounded-full bg-indigo-600/10 px-2 py-0.5">@{t}</span>)}
          </p>
        )}
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 md:flex-wrap md:overflow-visible">
          <button
            type="button"
            aria-pressed={effectiveDue === today}
            onClick={() => setDue(effectiveDue === today ? null : today)}
            className={`${chip} ${effectiveDue === today ? chipOn : chipOff}`}
          >
            Today
          </button>
          <button
            type="button"
            aria-pressed={effectiveDue === tomorrow}
            onClick={() => setDue(effectiveDue === tomorrow ? null : tomorrow)}
            className={`${chip} ${effectiveDue === tomorrow ? chipOn : chipOff}`}
          >
            Tomorrow
          </button>
          <span className={`${chip} ${customDate ? chipOn : chipOff}`}>
            <CalendarDays size={14} aria-hidden="true" />
            {customDate ? formatDue(effectiveDue, today).label : "Pick date"}
            <input
              type="date"
              aria-label="Due date"
              value={effectiveDue ?? ""}
              min={today}
              onChange={(e) => setDue(e.target.value || null)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {
                  /* not supported: the native control still works */
                }
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </span>
          <Dropdown
            label="Priority"
            title="Priority"
            value={effectivePriority}
            options={priorityOptions}
            onChange={setPriority}
            className={`${chip} ${chipOff}`}
          >
            <Flag size={14} aria-hidden="true" />
            {PRIORITY_STYLES[effectivePriority].label}
            <ChevronDown size={12} aria-hidden="true" />
          </Dropdown>
          <Dropdown
            label="List"
            title="Add to list"
            value={effectiveList ?? ""}
            options={listOptions}
            onChange={(v) => setList(v || null)}
            className={`${chip} ${effectiveList ? chipOn : chipOff}`}
          >
            <Hash size={14} aria-hidden="true" />
            <span className="max-w-24 truncate">{effectiveList ?? "Inbox"}</span>
            <ChevronDown size={12} aria-hidden="true" />
          </Dropdown>
        </div>
        <div role="group" aria-label="Quick tags" className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 md:flex-wrap md:overflow-visible">
          <Tag size={14} aria-hidden="true" className="shrink-0 text-neutral-400" />
          {tagChoices.map((tag) => {
            const on = effectiveTags.some((t) => same(t, tag));
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTag(tag)}
                className={`${chip} ${on ? chipOn : chipOff}`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
});
