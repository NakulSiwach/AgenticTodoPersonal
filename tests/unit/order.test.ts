import { describe, expect, it } from "vitest";
import { byPriorityThenOrder, effectiveOrder, orderAfterMove } from "@/lib/order";
import type { Priority, Todo } from "@/lib/types";

function todo(id: string, over: Partial<Todo> = {}): Todo {
  return {
    id,
    user_id: "u",
    title: id,
    notes: null,
    priority: 2 as Priority,
    completed: false,
    completed_at: null,
    text_color: null,
    highlight_color: null,
    due_date: null,
    list_name: null,
    tags: [],
    subtasks: [],
    repeat: null,
    sort_order: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("default order", () => {
  it("sorts by priority first, then newest when nothing was dragged", () => {
    const list = [
      todo("p2-old", { created_at: "2026-01-01T00:00:00Z" }),
      todo("p0", { priority: 0 }),
      todo("p2-new", { created_at: "2026-02-01T00:00:00Z" }),
    ].sort(byPriorityThenOrder);
    expect(list.map((t) => t.id)).toEqual(["p0", "p2-new", "p2-old"]);
  });

  it("lets a manual position win inside the same priority", () => {
    const newer = todo("newer", { created_at: "2026-02-01T00:00:00Z" });
    const older = todo("older", { created_at: "2026-01-01T00:00:00Z", sort_order: effectiveOrder(newer) - 5 });
    expect([newer, older].sort(byPriorityThenOrder).map((t) => t.id)).toEqual(["older", "newer"]);
  });
});

describe("orderAfterMove", () => {
  const a = todo("a", { sort_order: 10 });
  const b = todo("b", { sort_order: 20 });
  const c = todo("c", { sort_order: 30 });
  const list = [a, b, c];

  it("returns null when nothing moves or ids are unknown", () => {
    expect(orderAfterMove(list, "a", "a")).toBeNull();
    expect(orderAfterMove(list, "a", "zzz")).toBeNull();
  });
  it("puts a task between its new neighbours", () => {
    expect(orderAfterMove(list, "a", "b")).toBe(25); // [b, a, c]
    expect(orderAfterMove(list, "c", "b")).toBe(15); // [a, c, b]
  });
  it("handles the top and bottom of the list", () => {
    expect(orderAfterMove(list, "c", "a")).toBe(9); // before a
    expect(orderAfterMove(list, "a", "c")).toBe(31); // after c
  });
  it("works when some tasks have never been dragged", () => {
    const fresh = todo("fresh", { created_at: "2026-03-01T00:00:00Z" });
    const moved = orderAfterMove([fresh, a], "a", "fresh");
    expect(moved).toBeLessThan(effectiveOrder(fresh));
  });
});
