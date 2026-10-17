import type { PriorityFilter, StatusFilter, Todo } from "./types";

/** Incomplete first, then priority ascending (P0 first), then newest first. */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return b.created_at.localeCompare(a.created_at);
}

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort(compareTodos);
}

export function filterTodos(
  todos: Todo[],
  status: StatusFilter,
  priority: PriorityFilter,
): Todo[] {
  return todos.filter((t) => {
    if (status === "active" && t.completed) return false;
    if (status === "completed" && !t.completed) return false;
    if (priority !== "all" && t.priority !== priority) return false;
    return true;
  });
}
