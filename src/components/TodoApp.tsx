"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterTodos, sortTodos } from "@/lib/sort";
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from "@/lib/queries";
import type { Priority, PriorityFilter, StatusFilter, Todo, TodoPatch } from "@/lib/types";
import { Composer } from "./Composer";
import { EditSheet } from "./EditSheet";
import { FilterBar } from "./FilterBar";
import { Header } from "./Header";
import { useToast } from "./Toast";
import { TodoList } from "./TodoList";

const UNDO_WINDOW_MS = 5000;

export function TodoApp({ email }: { email: string }) {
  const { data, isLoading, isError, error, refetch } = useTodos();
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const remove = useDeleteTodo();
  const toast = useToast();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Todos waiting out the undo window: hidden from the list, not yet deleted.
  const [pendingDelete, setPendingDelete] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const all = useMemo(
    () => (data ?? []).filter((t) => !pendingDelete.has(t.id)),
    [data, pendingDelete],
  );
  const visible = useMemo(
    () => sortTodos(filterTodos(all, status, priority)),
    [all, status, priority],
  );
  const activeCount = all.filter((t) => !t.completed).length;
  const editing = all.find((t) => t.id === editingId) ?? null;

  const patch = useCallback(
    (id: string, p: TodoPatch) => update.mutate({ id, patch: p }),
    [update],
  );

  const scheduleDelete = (todo: Todo) => {
    setEditingId(null);
    setPendingDelete((prev) => new Set(prev).add(todo.id));
    const finish = (restore: boolean) => {
      const timer = timers.current.get(todo.id);
      if (timer) clearTimeout(timer);
      timers.current.delete(todo.id);
      setPendingDelete((prev) => {
        const next = new Set(prev);
        next.delete(todo.id);
        return next;
      });
      if (!restore) remove.mutate(todo.id);
    };
    timers.current.set(
      todo.id,
      setTimeout(() => finish(false), UNDO_WINDOW_MS),
    );
    toast.push({
      message: "Todo deleted",
      actionLabel: "Undo",
      durationMs: UNDO_WINDOW_MS,
      onAction: () => finish(true),
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <Header email={email} />
      <main className="flex-1 px-4 pb-64">
        <FilterBar
          status={status}
          priority={priority}
          onStatus={setStatus}
          onPriority={setPriority}
        />
        <p className="py-2 text-sm text-neutral-500 dark:text-neutral-400" aria-live="polite">
          {activeCount} active
        </p>
        {isError ? (
          <div role="alert" className="py-8 text-center">
            <p className="mb-3 text-red-600 dark:text-red-400">
              Couldn&apos;t load your todos{error instanceof Error ? `: ${error.message}` : ""}.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <TodoList
            todos={visible}
            loading={isLoading}
            onToggle={(t) => patch(t.id, { completed: !t.completed })}
            onOpen={(t) => setEditingId(t.id)}
            onPriority={(t, p: Priority) => patch(t.id, { priority: p })}
          />
        )}
      </main>
      <Composer onAdd={(input) => create.mutate({ ...input, id: crypto.randomUUID() })} />
      {editing && (
        <EditSheet
          key={editing.id}
          todo={editing}
          onClose={() => setEditingId(null)}
          onSave={(p) => {
            patch(editing.id, p);
            setEditingId(null);
          }}
          onDelete={() => scheduleDelete(editing)}
        />
      )}
    </div>
  );
}
