"use client";

import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Hash,
  Inbox,
  LayoutList,
  ListTodo,
  LogOut,
  Plus,
  Tag,
} from "lucide-react";
import { listNameSchema } from "@/lib/schema";
import { listView, tagView, type Counts } from "@/lib/views";
import type { ViewKey } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  view: ViewKey;
  counts: Counts;
  email: string;
  onView: (v: ViewKey) => void;
  onSignOut: () => void;
};

function Item({
  active,
  icon,
  label,
  count,
  alert,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${
        active
          ? "bg-indigo-600/10 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300"
          : "text-neutral-700 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-xs tabular-nums ${
            alert ? "font-bold text-red-600 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Sidebar({ view, counts, email, onView, onSignOut }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addList = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = listNameSchema.safeParse(name);
    if (!parsed.success || !parsed.data) {
      setError(name.length > 40 ? "Max 40 characters" : "Enter a name");
      return;
    }
    onView(listView(parsed.data));
    setName("");
    setError(null);
    setAdding(false);
  };

  const icon = 18;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
          <ListTodo size={18} aria-hidden="true" />
        </span>
        <span className="text-lg font-bold">TaskFlow</span>
      </div>

      <nav aria-label="Views" className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          <Item active={view === "inbox"} icon={<Inbox size={icon} />} label="Inbox" count={counts.inbox} onClick={() => onView("inbox")} />
          <Item active={view === "today"} icon={<CalendarDays size={icon} />} label="Today" count={counts.today} alert={counts.overdue > 0} onClick={() => onView("today")} />
          <Item active={view === "upcoming"} icon={<CalendarClock size={icon} />} label="Upcoming" count={counts.upcoming} onClick={() => onView("upcoming")} />
          <Item active={view === "all"} icon={<LayoutList size={icon} />} label="All tasks" count={counts.all} onClick={() => onView("all")} />
          <Item active={view === "completed"} icon={<CheckCircle2 size={icon} />} label="Completed" onClick={() => onView("completed")} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between px-3">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              Lists
            </h2>
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              aria-label="New list"
              aria-expanded={adding}
              className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          {adding && (
            <form onSubmit={addList} className="mb-1 px-2">
              <label htmlFor="new-list" className="sr-only">
                List name
              </label>
              <input
                id="new-list"
                autoFocus
                value={name}
                maxLength={41}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                placeholder="List name, then Enter"
                className="min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {error && (
                <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </form>
          )}
          <div className="space-y-0.5">
            {counts.lists.map((l) => (
              <Item key={l.name} active={view === listView(l.name)} icon={<Hash size={icon} />} label={l.name} count={l.count} onClick={() => onView(listView(l.name))} />
            ))}
            {counts.lists.length === 0 && !adding && (
              <p className="px-3 py-1 text-xs text-neutral-500 dark:text-neutral-400">
                Group tasks into lists like Work or Home.
              </p>
            )}
          </div>
        </div>

        {counts.tags.length > 0 && (
          <div>
            <h2 className="mb-1 px-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              Tags
            </h2>
            <div className="space-y-0.5">
              {counts.tags.map((t) => (
                <Item key={t.name} active={view === tagView(t.name)} icon={<Tag size={icon} />} label={t.name} count={t.count} onClick={() => onView(tagView(t.name))} />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="flex items-center gap-1 border-t border-neutral-200 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
        <div className="min-w-0 flex-1 px-2">
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={email}>
            {email}
          </p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="grid size-11 place-items-center rounded-xl text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <LogOut size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
