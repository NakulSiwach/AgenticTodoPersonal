import { describe, expect, it } from "vitest";
import { applyFilters, countViews, groupOpen, inView, todayProgress } from "@/lib/views";
import { toISODate } from "@/lib/dates";
import type { Todo } from "@/lib/types";

const TODAY = "2026-10-17";

function todo(id: string, over: Partial<Todo> = {}): Todo {
  return {
    id,
    user_id: "u",
    title: id,
    notes: null,
    priority: 2,
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
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...over,
  };
}

describe("inView", () => {
  const overdue = todo("overdue", { due_date: "2026-10-10" });
  const dueToday = todo("today", { due_date: TODAY });
  const later = todo("later", { due_date: "2026-10-30" });
  const work = todo("work", { list_name: "Work", tags: ["Big"] });

  it("today includes overdue and due-today but not future or undated", () => {
    const ids = [overdue, dueToday, later, work]
      .filter((t) => inView(t, "today", TODAY))
      .map((t) => t.id);
    expect(ids).toEqual(["overdue", "today"]);
  });
  it("upcoming is future-dated open tasks only", () => {
    const ids = [overdue, dueToday, later].filter((t) => inView(t, "upcoming", TODAY)).map((t) => t.id);
    expect(ids).toEqual(["later"]);
  });
  it("inbox excludes tasks in a list; lists and tags match case-insensitively", () => {
    expect(inView(work, "inbox", TODAY)).toBe(false);
    expect(inView(work, "list:work", TODAY)).toBe(true);
    expect(inView(work, "tag:big", TODAY)).toBe(true);
  });
  it("completed view only has finished tasks", () => {
    expect(inView(todo("d", { completed: true }), "completed", TODAY)).toBe(true);
    expect(inView(work, "completed", TODAY)).toBe(false);
  });
});

describe("applyFilters", () => {
  const items = [
    todo("Buy milk", { priority: 3, notes: "organic" }),
    todo("Write report", {
      priority: 0,
      tags: ["work"],
      subtasks: [{ id: "s", title: "Outline", done: false }],
    }),
  ];
  it("searches title, notes, tags and subtasks", () => {
    expect(applyFilters(items, "all", "ORGANIC").map((t) => t.id)).toEqual(["Buy milk"]);
    expect(applyFilters(items, "all", "work").map((t) => t.id)).toEqual(["Write report"]);
    expect(applyFilters(items, "all", "outline").map((t) => t.id)).toEqual(["Write report"]);
  });
  it("filters by priority", () => {
    expect(applyFilters(items, 0, "").map((t) => t.id)).toEqual(["Write report"]);
  });
});

describe("groupOpen", () => {
  const items = [
    todo("none"),
    todo("tomorrow", { due_date: "2026-10-18" }),
    todo("overdue", { due_date: "2026-10-01" }),
    todo("today-p3", { due_date: TODAY, priority: 3 }),
    todo("today-p0", { due_date: TODAY, priority: 0 }),
    todo("far", { due_date: "2027-01-01" }),
  ];
  it("groups by due date and orders by priority inside a group", () => {
    const groups = groupOpen(items, "smart", TODAY);
    expect(groups.map((g) => g.label)).toEqual(["Overdue", "Today", "Tomorrow", "Later", "No date"]);
    expect(groups[1].todos.map((t) => t.id)).toEqual(["today-p0", "today-p3"]);
  });
  it("drops the heading when everything is undated", () => {
    expect(groupOpen([todo("a"), todo("b")], "smart", TODAY)[0].label).toBeNull();
  });
  it("returns one flat list for other sorts", () => {
    const groups = groupOpen(items, "alpha", TODAY);
    expect(groups).toHaveLength(1);
    expect(groups[0].todos.map((t) => t.id)).toEqual([
      "far",
      "none",
      "overdue",
      "today-p0",
      "today-p3",
      "tomorrow",
    ]);
  });
});

describe("countViews / todayProgress", () => {
  const now = new Date();
  const doneToday = todo("done", {
    completed: true,
    completed_at: now.toISOString(),
    due_date: TODAY,
  });
  const items = [
    doneToday,
    todo("a", { due_date: "2026-10-10", list_name: "Work", tags: ["x"] }),
    todo("b", { due_date: TODAY, list_name: "work" }),
    todo("c", { due_date: "2026-10-20" }),
  ];
  it("counts open tasks per view, list and tag", () => {
    const c = countViews(items, TODAY);
    expect(c).toMatchObject({ all: 3, inbox: 1, today: 2, overdue: 1, upcoming: 1, completed: 1 });
    expect(c.lists).toEqual([{ name: "Work", count: 2 }]);
    expect(c.tags).toEqual([{ name: "x", count: 1 }]);
  });
  it("reports progress for today", () => {
    const local = toISODate(now);
    expect(todayProgress([doneToday, todo("open", { due_date: local })], local)).toEqual({
      done: 1,
      total: 2,
    });
  });
});
