"use client";

import { useState } from "react";
import { titleSchema } from "@/lib/schema";
import type { Priority } from "@/lib/types";
import { PriorityPicker } from "./PriorityPicker";

type Props = { onAdd: (input: { title: string; priority: Priority }) => void };

export function Composer({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(2);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = titleSchema.safeParse(title);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid title");
      return;
    }
    setError(null);
    onAdd({ title: parsed.data, priority });
    setTitle("");
  };

  return (
    <form
      onSubmit={submit}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <div className="mx-auto max-w-xl space-y-2">
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="new-todo">
            New todo
          </label>
          <input
            id="new-todo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Add a todo…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "new-todo-error" : undefined}
            className="min-h-11 flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white active:bg-indigo-700"
          >
            Add
          </button>
        </div>
        {error && (
          <p id="new-todo-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <PriorityPicker value={priority} onChange={setPriority} />
      </div>
    </form>
  );
}
