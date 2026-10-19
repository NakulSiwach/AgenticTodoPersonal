import { diffDays, toISODate } from "./dates";
import type { Todo } from "./types";

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  todos: Todo[];
};

/** Day a task is plotted on: its due date, or the day it was finished if it never had one. */
export function plotDay(t: Todo): string | null {
  if (t.due_date) return t.due_date;
  if (t.completed && t.completed_at) return toISODate(new Date(t.completed_at));
  return null;
}

export function groupByDay(todos: Todo[]): Map<string, Todo[]> {
  const map = new Map<string, Todo[]>();
  for (const t of todos) {
    const day = plotDay(t);
    if (!day) continue;
    const list = map.get(day) ?? [];
    list.push(t);
    map.set(day, list);
  }
  return map;
}

/** Weeks (Sunday first) covering `month` (0-11) of `year`, padded with neighbouring days. */
export function monthGrid(year: number, month: number, today: string, todos: Todo[]): CalendarDay[][] {
  const byDay = groupByDay(todos);
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = toISODate(cursor);
      week.push({
        date,
        inMonth: cursor.getMonth() === month,
        isToday: date === today,
        todos: byDay.get(date) ?? [],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month);
  return weeks;
}

export type MonthStats = { done: number; pending: number; overdue: number };

/** Counts for the tasks plotted inside the given month. */
export function monthStats(todos: Todo[], year: number, month: number, today: string): MonthStats {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const stats: MonthStats = { done: 0, pending: 0, overdue: 0 };
  for (const t of todos) {
    const day = plotDay(t);
    if (!day || !day.startsWith(prefix)) continue;
    if (t.completed) stats.done++;
    else {
      stats.pending++;
      if (diffDays(day, today) < 0) stats.overdue++;
    }
  }
  return stats;
}

export type TaskStatus = "done" | "overdue" | "pending";

export function taskStatus(t: Todo, today: string): TaskStatus {
  if (t.completed) return "done";
  return t.due_date !== null && diffDays(t.due_date, today) < 0 ? "overdue" : "pending";
}
