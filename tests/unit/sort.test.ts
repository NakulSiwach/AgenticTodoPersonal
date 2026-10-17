import { describe, expect, it } from "vitest";
import { filterTodos, sortTodos } from "@/lib/sort";
import type { Priority, Todo } from "@/lib/types";

function todo(id: string, priority: Priority, completed: boolean, created: string): Todo {
  return {
    id,
    user_id: "u",
    title: id,
    notes: null,
    priority,
    completed,
    completed_at: completed ? created : null,
    text_color: null,
    highlight_color: null,
    created_at: created,
    updated_at: created,
  };
}

const fixture = [
  todo("P2 done", 2, true, "2026-01-01T00:00:00Z"),
  todo("P0 old", 0, false, "2026-01-01T00:00:00Z"),
  todo("P3", 3, false, "2026-01-03T00:00:00Z"),
  todo("P0 new", 0, false, "2026-01-02T00:00:00Z"),
];

describe("sortTodos", () => {
  it("orders incomplete by priority then newest, completed last", () => {
    expect(sortTodos(fixture).map((t) => t.id)).toEqual(["P0 new", "P0 old", "P3", "P2 done"]);
  });
  it("does not mutate its input", () => {
    const copy = [...fixture];
    sortTodos(fixture);
    expect(fixture).toEqual(copy);
  });
});

describe("filterTodos", () => {
  it("filters by status", () => {
    expect(filterTodos(fixture, "active", "all")).toHaveLength(3);
    expect(filterTodos(fixture, "completed", "all").map((t) => t.id)).toEqual(["P2 done"]);
  });
  it("filters by priority", () => {
    expect(filterTodos(fixture, "all", 0)).toHaveLength(2);
    expect(filterTodos(fixture, "active", 2)).toHaveLength(0);
  });
});
