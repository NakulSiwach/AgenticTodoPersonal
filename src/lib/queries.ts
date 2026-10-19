"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { scheduleCalendarSync } from "@/lib/gcalClient";
import { createTodo, deleteTodo, listTodos, updateTodo } from "@/lib/todos";
import type { NewTodo, Todo, TodoPatch } from "@/lib/types";

export const TODOS_KEY = ["todos"] as const;

// Inserts still in flight, by todo id. Todos get their id on the client, so a quick tap can
// target a row the server has not stored yet; later writes wait for the insert to land first.
const pendingCreates = new Map<string, Promise<unknown>>();

async function afterCreate(id: string) {
  await pendingCreates.get(id)?.catch(() => {});
}

// Optimistic edits are applied twice: synchronously in the tap handler (so a controlled checkbox
// never visibly snaps back) and again after cancelling any in-flight fetch. Both are idempotent.
function withPatch(list: Todo[], id: string, patch: TodoPatch): Todo[] {
  return list.map((t) => {
    if (t.id !== id) return t;
    const next = { ...t, ...patch };
    if (patch.completed !== undefined) {
      next.completed_at = patch.completed ? (t.completed_at ?? new Date().toISOString()) : null;
    }
    return next;
  });
}

function buildOptimistic(input: NewTodo): Todo {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: "",
    title: input.title.trim(),
    notes: input.notes ?? null,
    priority: input.priority,
    completed: false,
    completed_at: null,
    text_color: input.text_color ?? null,
    highlight_color: input.highlight_color ?? null,
    due_date: input.due_date ?? null,
    list_name: input.list_name ?? null,
    tags: input.tags ?? [],
    subtasks: input.subtasks ?? [],
    repeat: input.repeat ?? null,
    sort_order: null,
    created_at: now,
    updated_at: now,
  };
}

type WithPrev<T> = T & { prev: Todo[] | undefined };

export function useTodos() {
  return useQuery({ queryKey: TODOS_KEY, queryFn: listTodos });
}

function useTodoCache() {
  const qc = useQueryClient();
  const current = () => qc.getQueryData<Todo[]>(TODOS_KEY);
  // Stop an in-flight list fetch from landing on top of the optimistic change.
  const cancel = () => qc.cancelQueries({ queryKey: TODOS_KEY });
  const set = (updater: (prev: Todo[]) => Todo[]) =>
    qc.setQueryData<Todo[]>(TODOS_KEY, (prev) => updater(prev ?? []));
  const restore = (prev: Todo[] | undefined) => qc.setQueryData(TODOS_KEY, prev);
  const refresh = () => qc.invalidateQueries({ queryKey: TODOS_KEY });
  // Swap in the row the server returned (it has the real timestamps) without refetching the list.
  // Skipped while other writes are still in flight so a late reply can't undo a newer tap.
  const adopt = (saved: Todo) => {
    if (qc.isMutating() > 1) return;
    set((list) => list.map((t) => (t.id === saved.id ? saved : t)));
  };
  // Every successful write nudges the Google Calendar sync (a no-op unless connected).
  const synced = () => scheduleCalendarSync(qc);
  return { current, cancel, set, restore, refresh, adopt, synced };
}

export function useCreateTodo() {
  const cache = useTodoCache();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: (vars: WithPrev<NewTodo>) => {
      const input: NewTodo = { ...vars };
      delete (input as Partial<WithPrev<NewTodo>>).prev;
      const request = createTodo(input);
      pendingCreates.set(input.id, request);
      const clear = () => pendingCreates.delete(input.id);
      request.then(clear, clear);
      return request;
    },
    onMutate: async (vars) => {
      await cache.cancel();
      cache.set((list) =>
        list.some((t) => t.id === vars.id) ? list : [buildOptimistic(vars), ...list],
      );
      return { prev: vars.prev };
    },
    onSuccess: (saved) => {
      cache.adopt(saved);
      cache.synced();
    },
    onError: (err, _vars, ctx) => {
      cache.restore(ctx?.prev);
      toast.push({ message: `Could not add todo: ${err.message}` });
      cache.refresh();
    },
  });
  const { mutate: run } = mutation;
  const mutate = useCallback(
    (input: NewTodo) => {
      const prev = cache.current();
      cache.set((list) => [buildOptimistic(input), ...list]);
      run({ ...input, prev });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  );
  return { ...mutation, mutate };
}

export function useUpdateTodo() {
  const cache = useTodoCache();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async ({ id, patch }: WithPrev<{ id: string; patch: TodoPatch }>) => {
      await afterCreate(id);
      return updateTodo(id, patch);
    },
    onMutate: async ({ id, patch, prev }) => {
      await cache.cancel();
      cache.set((list) => withPatch(list, id, patch));
      return { prev };
    },
    onSuccess: (saved) => {
      cache.adopt(saved);
      cache.synced();
    },
    onError: (err, _vars, ctx) => {
      cache.restore(ctx?.prev);
      toast.push({ message: `Could not save change: ${err.message}` });
      cache.refresh();
    },
  });
  const { mutate: run } = mutation;
  const mutate = useCallback(
    (vars: { id: string; patch: TodoPatch }) => {
      const prev = cache.current();
      cache.set((list) => withPatch(list, vars.id, vars.patch));
      run({ ...vars, prev });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  );
  return { ...mutation, mutate };
}

export function useDeleteTodo() {
  const cache = useTodoCache();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async ({ id }: WithPrev<{ id: string }>) => {
      await afterCreate(id);
      return deleteTodo(id);
    },
    onMutate: async ({ id, prev }) => {
      await cache.cancel();
      cache.set((list) => list.filter((t) => t.id !== id));
      return { prev };
    },
    onSuccess: () => cache.synced(),
    onError: (err, _vars, ctx) => {
      cache.restore(ctx?.prev);
      toast.push({ message: `Could not delete: ${err.message}` });
      cache.refresh();
    },
  });
  const { mutate: run } = mutation;
  const mutate = useCallback(
    (id: string) => {
      const prev = cache.current();
      cache.set((list) => list.filter((t) => t.id !== id));
      run({ id, prev });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  );
  return { ...mutation, mutate };
}
