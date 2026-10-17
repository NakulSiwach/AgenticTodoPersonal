import type { Repeat } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as `YYYY-MM-DD` (never UTC, so "today" matches the user's wall clock). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

/** Date of the next given weekday (0 = Sunday) strictly after `from`. */
export function nextWeekday(from: string, weekday: number): string {
  const delta = (weekday - parseISODate(from).getDay() + 7) % 7 || 7;
  return addDays(from, delta);
}

function addMonths(iso: string, months: number): string {
  const d = parseISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

function step(iso: string, repeat: Repeat): string {
  switch (repeat) {
    case "daily":
      return addDays(iso, 1);
    case "weekdays": {
      let next = addDays(iso, 1);
      while ([0, 6].includes(parseISODate(next).getDay())) next = addDays(next, 1);
      return next;
    }
    case "weekly":
      return addDays(iso, 7);
    case "monthly":
      return addMonths(iso, 1);
    case "yearly":
      return addMonths(iso, 12);
  }
}

/** Next due date after completing a repeating task: always later than `now`. */
export function nextOccurrence(due: string, repeat: Repeat, now: string = today()): string {
  let next = step(due, repeat);
  while (next <= now) next = step(next, repeat);
  return next;
}

export type DueTone = "overdue" | "today" | "soon" | "later";

export function formatDue(iso: string, now: string = today()): { label: string; tone: DueTone } {
  const diff = diffDays(iso, now);
  const date = parseISODate(iso);
  const short = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== parseISODate(now).getFullYear() ? { year: "numeric" } : {}),
  });
  if (diff === 0) return { label: "Today", tone: "today" };
  if (diff === 1) return { label: "Tomorrow", tone: "soon" };
  if (diff === -1) return { label: "Yesterday", tone: "overdue" };
  if (diff < 0) return { label: short, tone: "overdue" };
  if (diff < 7) {
    return { label: date.toLocaleDateString(undefined, { weekday: "short" }), tone: "soon" };
  }
  return { label: short, tone: "later" };
}

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export const REPEAT_LABELS: Record<Repeat, string> = {
  daily: "Every day",
  weekdays: "Every weekday",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};
