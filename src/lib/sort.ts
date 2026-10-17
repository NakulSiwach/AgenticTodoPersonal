import type { Todo } from "./types";

/** Incomplete first, then priority ascending (P0 first), then newest first. */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return b.created_at.localeCompare(a.created_at);
}

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort(compareTodos);
}
