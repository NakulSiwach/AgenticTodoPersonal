// Pure mapping from TaskFlow tasks to Google Calendar events, plus the diff that decides what a
// sync must create, update or delete. No I/O here, so it is fully unit-tested.
import { addDays } from "./dates";
import type { Priority, Repeat, Todo } from "./types";

export type SyncTodo = Pick<
  Todo,
  | "id"
  | "title"
  | "notes"
  | "priority"
  | "completed"
  | "due_date"
  | "list_name"
  | "tags"
  | "subtasks"
  | "repeat"
>;

/** Columns a sync reads; keep in step with `SyncTodo`. */
export const SYNC_COLUMNS = "id,title,notes,priority,completed,due_date,list_name,tags,subtasks,repeat";

export type CalendarEvent = {
  id: string;
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  recurrence?: string[];
  colorId: string;
  transparency: "transparent";
  status: "confirmed";
  extendedProperties: { private: { taskflow: "1"; tfhash: string } };
};

/** What a sync knows about an event already in Google. */
export type ExistingEvent = { id: string; hash: string | null };

export type SyncPlan = {
  /** `exists`: the event is already in Google (update it) or not (insert it). */
  upserts: { event: CalendarEvent; exists: boolean }[];
  deletes: string[];
};

// Google event ids use base32hex (0-9, a-v), 5-1024 chars. A UUID without dashes is plain hex,
// so each task maps to a fixed event id and repeated syncs can never create duplicates.
export function eventIdFor(todoId: string): string {
  return todoId.toLowerCase().replace(/[^0-9a-f]/g, "");
}

// Google's event palette: 11 Tomato, 6 Tangerine, 5 Banana, 9 Blueberry, 8 Graphite.
const PRIORITY_EVENT_COLOR: Record<Priority, string> = { 0: "11", 1: "6", 2: "5", 3: "9", 4: "8" };
const DONE_EVENT_COLOR = "8";

const RRULES: Record<Repeat, string> = {
  daily: "RRULE:FREQ=DAILY",
  weekdays: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  weekly: "RRULE:FREQ=WEEKLY",
  monthly: "RRULE:FREQ=MONTHLY",
  yearly: "RRULE:FREQ=YEARLY",
};

function describe(todo: SyncTodo, appUrl: string): string {
  const meta = [`Priority: P${todo.priority}`];
  if (todo.list_name) meta.push(`List: ${todo.list_name}`);
  if (todo.tags.length) meta.push(`Tags: ${todo.tags.map((t) => `@${t}`).join(" ")}`);
  const parts = [meta.join(" · ")];
  if (todo.subtasks.length) {
    const done = todo.subtasks.filter((s) => s.done).length;
    parts.push(
      [`Subtasks (${done}/${todo.subtasks.length}):`, ...todo.subtasks.map((s) => `${s.done ? "☑" : "☐"} ${s.title}`)].join(
        "\n",
      ),
    );
  }
  if (todo.notes?.trim()) parts.push(todo.notes.trim());
  parts.push(`Open in TaskFlow: ${appUrl}`);
  return parts.join("\n\n");
}

// FNV-1a: a small, stable fingerprint of the event body, stored on the event so unchanged tasks
// cost no write. Collisions only mean one skipped update, and the next edit fixes it.
function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** The all-day event for a task, or null when the task has no due date (not synced). */
export function buildEvent(todo: SyncTodo, appUrl: string): CalendarEvent | null {
  if (!todo.due_date) return null;
  const body = {
    summary: todo.completed ? `✓ ${todo.title}` : todo.title,
    description: describe(todo, appUrl),
    start: { date: todo.due_date },
    // All-day events end on the following day (exclusive).
    end: { date: addDays(todo.due_date, 1) },
    ...(todo.repeat && !todo.completed ? { recurrence: [RRULES[todo.repeat]] } : {}),
    colorId: todo.completed ? DONE_EVENT_COLOR : PRIORITY_EVENT_COLOR[todo.priority],
  };
  return {
    id: eventIdFor(todo.id),
    ...body,
    transparency: "transparent", // shows as "free": a task shouldn't block the day
    status: "confirmed",
    extendedProperties: { private: { taskflow: "1", tfhash: fingerprint(JSON.stringify(body)) } },
  };
}

/** Compare what Google has with what the tasks say. Events TaskFlow didn't make are never listed here. */
export function planSync(todos: SyncTodo[], existing: ExistingEvent[], appUrl: string): SyncPlan {
  const have = new Map(existing.map((e) => [e.id, e.hash]));
  const wanted = new Set<string>();
  const upserts: SyncPlan["upserts"] = [];
  for (const todo of todos) {
    const event = buildEvent(todo, appUrl);
    if (!event) continue;
    wanted.add(event.id);
    const exists = have.has(event.id);
    if (exists && have.get(event.id) === event.extendedProperties.private.tfhash) continue;
    upserts.push({ event, exists });
  }
  const deletes = existing.filter((e) => !wanted.has(e.id)).map((e) => e.id);
  return { upserts, deletes };
}
