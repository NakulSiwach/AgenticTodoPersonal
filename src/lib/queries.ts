"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { createTodo, deleteTodo, listTodos, updateTodo } from "@/lib/todos";
import type { NewTodo, Todo, TodoPatch } from "@/lib/types";

export const TODOS_KEY = ["todos"] as const;

// Inserts still in flight, by todo id. Todos get their id on the client, so a quick tap can
// target a row the server has not stored yet; later writes wait for the insert to land first.
const pendingCreates = new Map<string, Promise<unknown>>();

async function afterCreate(id: string) {
  await pendingCreates.get(id)?.catch(() => {});
}

export function useTodos() {
  return useQuery({ queryKey: TODOS_KEY, queryFn: listTodos });
}

function useTodoCache() {
  const qc = useQueryClient();
  const snapshot = async () => {
    await qc.cancelQueries({ queryKey: TODOS_KEY });
    return qc.getQueryData<Todo[]>(TODOS_KEY);
  };
  const set = (updater: (prev: Todo[]) => Todo[]) =>
    qc.setQueryData<Todo[]>(TODOS_KEY, (prev) => updater(prev ?? []));
  const restore = (prev: Todo[] | undefined) => qc.setQueryData(TODOS_KEY, prev);
  const refresh = () => qc.invalidateQueries({ queryKey: TODOS_KEY });
  return { snapshot, set, restore, refresh };
}

export function useCreateTodo() {
  const cache = useTodoCache();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: NewTodo) => {
      const request = createTodo(input);
      pendingCreates.set(input.id, request);
      const clear = () => pendingCreates.delete(input.id);
      request.then(clear, clear);
      return request;
    },
    onMutate: async (input) => {
      const prev = await cache.snapshot();
      const now = new Date().toISOString();
      const optimistic: Todo = {
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
        created_at: now,
        updated_at: now,
      };
      cache.set((list) => [optimistic, ...list]);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      cache.restore(ctx?.prev);
      toast.push({ message: `Could not add todo: ${err.message}` });
    },
    onSettled: () => cache.refresh(),
  });
}

export function useUpdateTodo() {
  const cache = useTodoCache();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TodoPatch }) => {
      await afterCreate(id);
      return updateTodo(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      const prev = await cache.snapshot();
      cache.set((list) =>
        list.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch };
          if (patch.completed !== undefined) {
            next.completed_at = patch.completed ? new Date().toISOString() : null;
          }
          return next;
        }),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      cache.restore(ctx?.prev);
      toast.push({ message: `Could not save change: ${err.message}` });
    },
    onSettled: () => cache.refresh(),
  });
}

export function useDeleteTodo() {
  const cache = useTodoCache();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      await afterCreate(id);
      return deleteTodo(id);
    },
    onMutate: async (id) => {
      const prev = await cache.snapshot();
      cache.set((list) => list.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      cache.restore(ctx?.prev);
      toast.push({ message: `Could not delete: ${err.message}` });
    },
    onSettled: () => cache.refresh(),
  });
}
