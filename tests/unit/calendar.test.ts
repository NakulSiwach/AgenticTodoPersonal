import { describe, expect, it } from "vitest";
import { groupByDay, monthGrid, monthStats, plotDay, taskStatus } from "@/lib/calendar";
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

describe("calendar", () => {
  it("plots a task on its due date, or its completion day if it has none", () => {
    expect(plotDay(todo("a", { due_date: "2026-10-20" }))).toBe("2026-10-20");
    const done = new Date(2026, 9, 5, 14, 0).toISOString();
    expect(plotDay(todo("b", { completed: true, completed_at: done }))).toBe("2026-10-05");
    expect(plotDay(todo("c"))).toBeNull();
  });

  it("groups tasks by day", () => {
    const map = groupByDay([todo("a", { due_date: "2026-10-20" }), todo("b", { due_date: "2026-10-20" }), todo("c")]);
    expect(map.get("2026-10-20")).toHaveLength(2);
    expect(map.size).toBe(1);
  });

  it("builds whole Sunday-first weeks around the month", () => {
    const weeks = monthGrid(2026, 9, TODAY, [todo("a", { due_date: "2026-10-17" })]); // October 2026
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date).toBe("2026-09-27"); // Oct 1 is a Thursday
    expect(weeks[0][0].inMonth).toBe(false);
    const flat = weeks.flat();
    expect(flat.filter((d) => d.inMonth)).toHaveLength(31);
    expect(flat.find((d) => d.date === TODAY)).toMatchObject({ isToday: true });
    expect(flat.find((d) => d.date === TODAY)?.todos).toHaveLength(1);
    expect(toISODate(new Date(2026, 9, 31))).toBe(weeks.flat().filter((d) => d.inMonth).at(-1)?.date);
  });

  it("handles months that start on Sunday and December", () => {
    expect(monthGrid(2026, 1, TODAY, [])[0][0].date).toBe("2026-02-01"); // Feb 2026 starts on Sunday
    const dec = monthGrid(2026, 11, TODAY, []);
    expect(dec.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });

  it("counts done, pending and overdue inside a month", () => {
    const stats = monthStats(
      [
        todo("done", { completed: true, due_date: "2026-10-03" }),
        todo("late", { due_date: "2026-10-10" }),
        todo("soon", { due_date: "2026-10-25" }),
        todo("other-month", { due_date: "2026-11-02" }),
      ],
      2026,
      9,
      TODAY,
    );
    expect(stats).toEqual({ done: 1, pending: 2, overdue: 1 });
  });

  it("classifies task status", () => {
    expect(taskStatus(todo("a", { completed: true }), TODAY)).toBe("done");
    expect(taskStatus(todo("b", { due_date: "2026-10-01" }), TODAY)).toBe("overdue");
    expect(taskStatus(todo("c", { due_date: TODAY }), TODAY)).toBe("pending");
    expect(taskStatus(todo("d"), TODAY)).toBe("pending");
  });
});
