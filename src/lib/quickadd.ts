import { addDays, nextWeekday, today as todayISO } from "./dates";
import type { Priority, Repeat } from "./types";

export type QuickAdd = {
  title: string;
  due_date?: string;
  priority?: Priority;
  list_name?: string;
  tags: string[];
  repeat?: Repeat;
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_NAMES = WEEKDAYS.join("|");
const REPEAT_WORDS: Record<string, Repeat> = {
  day: "daily",
  weekday: "weekdays",
  week: "weekly",
  month: "monthly",
  year: "yearly",
};

/**
 * Pulls Todoist-style tokens out of a title:
 * `tomorrow`, `friday`, `in 3 days`, `every week`, `!1` / `p1`, `#list`, `@tag`.
 * If nothing is left of the title afterwards, the text is kept as a plain title.
 */
export function parseQuickAdd(input: string, now: string = todayISO()): QuickAdd {
  let text = ` ${input} `;
  const out: QuickAdd = { title: "", tags: [] };

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = text.match(re);
    if (!m) return false;
    fn(m);
    text = text.replace(re, " ");
    return true;
  };

  take(/\s(?:every|each)\s+(day|weekday|week|month|year)(?=\s)/i, (m) => {
    out.repeat = REPEAT_WORDS[m[1].toLowerCase()];
  });
  take(new RegExp(`\\s(?:every|each)\\s+(${DAY_NAMES})(?=\\s)`, "i"), (m) => {
    out.repeat = "weekly";
    out.due_date = nextWeekday(addDays(now, -1), WEEKDAYS.indexOf(m[1].toLowerCase()));
  });
  take(/\s(?:tomorrow|tmrw|tmr)(?=\s)/i, () => (out.due_date ??= addDays(now, 1)));
  take(/\s(?:today|tonight)(?=\s)/i, () => (out.due_date ??= now));
  take(/\snext\s+week(?=\s)/i, () => (out.due_date ??= nextWeekday(now, 1)));
  take(/\sin\s+(\d{1,3})\s+(day|days|week|weeks)(?=\s)/i, (m) => {
    const n = Number(m[1]) * (m[2].toLowerCase().startsWith("week") ? 7 : 1);
    out.due_date ??= addDays(now, n);
  });
  take(new RegExp(`\\s(?:(?:on|next)\\s+)?(${DAY_NAMES})(?=\\s)`, "i"), (m) => {
    out.due_date ??= nextWeekday(now, WEEKDAYS.indexOf(m[1].toLowerCase()));
  });
  take(/\s(?:!|p)([0-4])(?=\s)/, (m) => (out.priority = Number(m[1]) as Priority));
  take(/\s#([\p{L}\p{N}_-]{1,40})(?=\s)/u, (m) => (out.list_name = m[1]));
  while (
    take(/\s@([\p{L}\p{N}_-]{1,30})(?=\s)/u, (m) => {
      const known = out.tags.some((t) => t.toLowerCase() === m[1].toLowerCase());
      if (!known && out.tags.length < 10) out.tags.push(m[1]);
    })
  );

  const title = text.replace(/\s+/g, " ").trim();
  if (!title) return { title: input.trim(), tags: [] };
  out.title = title;
  return out;
}
