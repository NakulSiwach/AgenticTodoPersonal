import { z } from "zod";
import { addDays, parseISODate } from "./dates";

// Recurring reminders ("take medicines", "water the plants"). Plain text, no completion state:
// they show up on the days they're due and are listed in that morning's email.

export const REMINDER_SCHEDULES = ["daily", "weekdays", "weekly", "monthly", "yearly", "once"] as const;
export type ReminderSchedule = (typeof REMINDER_SCHEDULES)[number];

export type Reminder = {
  id: string;
  user_id: string;
  text: string;
  schedule: ReminderSchedule;
  /** 0 = Sunday … 6 = Saturday. Used by `weekly`. */
  days_of_week: number[];
  /** `YYYY-MM-DD`. Monthly uses its day, yearly its month + day, once the date itself. */
  on_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReminderInput = {
  id: string;
  text: string;
  schedule: ReminderSchedule;
  days_of_week: number[];
  on_date: string | null;
  active: boolean;
};

export type ReminderPatch = Partial<Omit<ReminderInput, "id">>;

export const SCHEDULE_LABELS: Record<ReminderSchedule, string> = {
  daily: "Every day",
  weekdays: "Weekdays (Mon–Fri)",
  weekly: "Specific days of the week",
  monthly: "Every month",
  yearly: "Every year",
  once: "Once, on a date",
};

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const dayList = z.array(z.number().int().min(0).max(6)).max(7);

/** Mirrors the SQL CHECK constraints in 0005_reminders_and_quotes.sql. */
export const reminderSchema = z
  .object({
    id: z.string().uuid(),
    text: z
      .string()
      .trim()
      .min(1, "Write what to remind you about")
      .max(200, "Keep it under 200 characters"),
    schedule: z.enum(REMINDER_SCHEDULES),
    days_of_week: dayList,
    on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").nullable(),
    active: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (r.schedule === "weekly" && r.days_of_week.length === 0) {
      ctx.addIssue({ code: "custom", path: ["days_of_week"], message: "Pick at least one day" });
    }
    if (["monthly", "yearly", "once"].includes(r.schedule) && !r.on_date) {
      ctx.addIssue({ code: "custom", path: ["on_date"], message: "Pick a date" });
    }
  });

/** Store only the fields a schedule uses, so stale values can't leak into another schedule. */
export function cleanReminder(r: ReminderInput): ReminderInput {
  return {
    ...r,
    text: r.text.trim(),
    days_of_week: r.schedule === "weekly" ? [...new Set(r.days_of_week)].sort((a, b) => a - b) : [],
    on_date: ["monthly", "yearly", "once"].includes(r.schedule) ? r.on_date : null,
  };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Is the reminder due on this local date (`YYYY-MM-DD`)? */
export function isDueOn(r: Pick<Reminder, "schedule" | "days_of_week" | "on_date" | "active">, date: string): boolean {
  if (!r.active) return false;
  const d = parseISODate(date);
  switch (r.schedule) {
    case "daily":
      return true;
    case "weekdays":
      return d.getDay() >= 1 && d.getDay() <= 5;
    case "weekly":
      return r.days_of_week.includes(d.getDay());
    case "once":
      return r.on_date === date;
    case "monthly": {
      if (!r.on_date) return false;
      // The 31st falls on the last day of shorter months.
      const want = Math.min(parseISODate(r.on_date).getDate(), lastDayOfMonth(d.getFullYear(), d.getMonth()));
      return d.getDate() === want;
    }
    case "yearly": {
      if (!r.on_date) return false;
      const anchor = parseISODate(r.on_date);
      if (anchor.getMonth() !== d.getMonth()) return false;
      // 29 Feb falls on 28 Feb in non-leap years.
      return d.getDate() === Math.min(anchor.getDate(), lastDayOfMonth(d.getFullYear(), d.getMonth()));
    }
  }
}

export function dueOn<T extends Pick<Reminder, "schedule" | "days_of_week" | "on_date" | "active">>(
  reminders: T[],
  date: string,
): T[] {
  return reminders.filter((r) => isDueOn(r, date));
}

/** Next date (today included) the reminder is due, within the coming ~13 months; null if never. */
export function nextDueDate(r: Reminder, from: string): string | null {
  if (!r.active) return null;
  if (r.schedule === "once") return r.on_date && r.on_date >= from ? r.on_date : null;
  for (let i = 0; i < 400; i++) {
    const day = addDays(from, i);
    if (isDueOn(r, day)) return day;
  }
  return null;
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

/** Human description, e.g. "Every Mon, Wed, Fri" or "Monthly on the 15th". */
export function describeSchedule(r: Pick<Reminder, "schedule" | "days_of_week" | "on_date">): string {
  const date = r.on_date ? parseISODate(r.on_date) : null;
  switch (r.schedule) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "weekly": {
      const days = [...r.days_of_week].sort((a, b) => a - b);
      if (days.length === 7) return "Every day";
      if (days.join() === "0,6") return "Weekends";
      return `Every ${days.map((d) => WEEKDAY_SHORT[d]).join(", ")}`;
    }
    case "monthly":
      return date ? `Monthly on the ${ordinal(date.getDate())}` : "Monthly";
    case "yearly":
      return date ? `Every year on ${date.getDate()} ${MONTHS[date.getMonth()]}` : "Every year";
    case "once":
      return date
        ? `On ${WEEKDAY_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
        : "Once";
  }
}

/** Due-today first, then by next date, then alphabetically; paused and past one-offs last. */
export function sortReminders(reminders: Reminder[], today: string): Reminder[] {
  const key = (r: Reminder) => nextDueDate(r, today) ?? "9999-99-99";
  return [...reminders].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      key(a).localeCompare(key(b)) ||
      a.text.localeCompare(b.text, undefined, { sensitivity: "base" }),
  );
}
