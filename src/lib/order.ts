import type { Todo } from "./types";

/**
 * Position used for ordering. Tasks that were never dragged fall back to "newest first",
 * expressed on the same number line (newer = more negative = earlier) so dragged and
 * undragged tasks can be mixed and a drag only ever has to write one row.
 */
export function effectiveOrder(t: Todo): number {
  return t.sort_order ?? -Date.parse(t.created_at) / 1000;
}

export const byOrder = (a: Todo, b: Todo) => effectiveOrder(a) - effectiveOrder(b);

/** Default list order: priority first (P0 on top), then manual position, then newest. */
export function byPriorityThenOrder(a: Todo, b: Todo): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return byOrder(a, b) || b.created_at.localeCompare(a.created_at);
}

/**
 * New `sort_order` for `activeId` after it is dropped onto `overId` in the currently shown
 * `list`. Returns null when nothing moves. The value sits halfway between its new neighbours.
 */
export function orderAfterMove(list: Todo[], activeId: string, overId: string): number | null {
  const from = list.findIndex((t) => t.id === activeId);
  const to = list.findIndex((t) => t.id === overId);
  if (from < 0 || to < 0 || from === to) return null;

  const rest = list.filter((t) => t.id !== activeId);
  // After removing the active task, dropping on `over` places it at index `to`.
  const prev = rest[to - 1];
  const next = rest[to];
  if (prev && next) return (effectiveOrder(prev) + effectiveOrder(next)) / 2;
  if (next) return effectiveOrder(next) - 1;
  if (prev) return effectiveOrder(prev) + 1;
  return null;
}
