"use client";

import { useState } from "react";
import { ChevronRight, PartyPopper, SearchX } from "lucide-react";
import type { Group } from "@/lib/views";
import type { Priority, Todo } from "@/lib/types";
import { TodoRow } from "./TodoRow";

type Props = {
  groups: Group[];
  done: Todo[];
  loading: boolean;
  today: string;
  showList: boolean;
  /** True when a search or priority filter is hiding tasks. */
  filtered: boolean;
  emptyHint: string;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  onPriority: (todo: Todo, p: Priority) => void;
};

export function TodoList({
  groups,
  done,
  loading,
  today,
  showList,
  filtered,
  emptyHint,
  onToggle,
  onOpen,
  onPriority,
}: Props) {
  const [showDone, setShowDone] = useState(true);

  if (loading) {
    return (
      <ul aria-busy="true" aria-label="Loading todos" className="space-y-2 py-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-12 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </ul>
    );
  }

  const rowProps = { today, showList, onToggle, onOpen, onPriority };
  const empty = groups.length === 0 && done.length === 0;

  if (empty) {
    const Icon = filtered ? SearchX : PartyPopper;
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-neutral-500 dark:text-neutral-400">
        <Icon size={40} aria-hidden="true" className="text-indigo-500" />
        <p className="text-base font-medium text-neutral-800 dark:text-neutral-200">
          {filtered ? "No matching tasks" : "Nothing to do"}
        </p>
        <p className="max-w-xs text-sm">{filtered ? "Try a different search or filter." : emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label ?? "Tasks"}>
          {g.label && (
            <h3
              className={`mb-1 flex items-baseline gap-2 border-b border-neutral-200 px-1 pb-1 text-sm font-semibold dark:border-neutral-800 ${
                g.key === "overdue" ? "text-red-600 dark:text-red-400" : ""
              }`}
            >
              {g.label}
              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {g.todos.length}
              </span>
            </h3>
          )}
          <ul>
            {g.todos.map((t) => (
              <TodoRow key={t.id} todo={t} {...rowProps} />
            ))}
          </ul>
        </section>
      ))}
      {done.length > 0 && (
        <section aria-label="Completed tasks">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex min-h-11 w-full items-center gap-1 rounded-lg px-1 text-sm font-semibold text-neutral-600 dark:text-neutral-300"
          >
            <ChevronRight
              size={16}
              aria-hidden="true"
              className={`transition-transform ${showDone ? "rotate-90" : ""}`}
            />
            Completed
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {done.length}
            </span>
          </button>
          {showDone && (
            <ul>
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} {...rowProps} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
