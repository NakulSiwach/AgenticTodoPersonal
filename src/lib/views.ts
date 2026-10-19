import { diffDays, formatLongDate, toISODate } from "./dates";
import { byOrder, byPriorityThenOrder } from "./order";
import { compareTodos } from "./sort";
import type { PriorityFilter, SortKey, Todo, ViewKey } from "./types";

export const listView = (name: string): ViewKey => `list:${name}`;
export const tagView = (name: string): ViewKey => `tag:${name}`;

export function viewTitle(view: ViewKey): string {
  if (view.startsWith("list:")) return view.slice(5);
  if (view.startsWith("tag:")) return `@${view.slice(4)}`;
  return (
    {
      inbox: "Inbox",
      today: "Today",
      upcoming: "Upcoming",
      all: "All tasks",
      completed: "Completed",
      reminders: "Reminders",
    }[view] ?? "Tasks"
  );
}

const same = (a: string | null, b: string) => a !== null && a.toLowerCase() === b.toLowerCase();

/** Local calendar day a todo was completed on (`YYYY-MM-DD`), or null. */
function completedDay(t: Todo): string | null {
  return t.completed_at ? toISODate(new Date(t.completed_at)) : null;
}

/** Does the todo belong to the view (ignoring search and filters)? */
export function inView(t: Todo, view: ViewKey, today: string): boolean {
  if (view.startsWith("list:")) return same(t.list_name, view.slice(5));
  if (view.startsWith("tag:")) return t.tags.some((x) => same(x, view.slice(4)));
  switch (view) {
    case "inbox":
      return t.list_name === null;
    case "today":
      return t.completed
        ? completedDay(t) === today
        : t.due_date !== null && t.due_date <= today;
    case "upcoming":
      return !t.completed && t.due_date !== null && t.due_date > today;
    case "completed":
      return t.completed;
    default:
      return true;
  }
}

export function matchesSearch(t: Todo, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [t.title, t.notes ?? "", t.list_name ?? "", ...t.tags, ...t.subtasks.map((s) => s.title)]
    .join("\n")
    .toLowerCase()
    .includes(q);
}

export type Group = { key: string; label: string | null; todos: Todo[] };

function dueGroup(due: string | null, today: string): { key: string; label: string; order: number } {
  if (due === null) return { key: "none", label: "No date", order: 1e6 };
  const d = diffDays(due, today);
  if (d < 0) return { key: "overdue", label: "Overdue", order: -1 };
  if (d === 0) return { key: "today", label: "Today", order: 0 };
  if (d === 1) return { key: "tomorrow", label: "Tomorrow", order: 1 };
  if (d < 7) return { key: due, label: formatLongDate(due), order: d };
  return { key: "later", label: "Later", order: 100 };
}

const byDue = (a: Todo, b: Todo) =>
  (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || compareTodos(a, b);

const SORTERS: Record<Exclude<SortKey, "smart">, (a: Todo, b: Todo) => number> = {
  due: byDue,
  priority: byPriorityThenOrder,
  manual: byOrder,
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
};

/**
 * Splits the open todos into sections. "smart" groups by due date (Overdue, Today, Tomorrow,
 * weekdays, Later, No date) with priority order inside each; other sorts give one flat list.
 */
export function groupOpen(todos: Todo[], sort: SortKey, today: string): Group[] {
  if (sort !== "smart") {
    if (todos.length === 0) return [];
    return [{ key: "all", label: null, todos: [...todos].sort(SORTERS[sort]) }];
  }
  const buckets = new Map<string, Group & { order: number }>();
  for (const t of todos) {
    const g = dueGroup(t.due_date, today);
    const bucket = buckets.get(g.key) ?? { key: g.key, label: g.label, order: g.order, todos: [] };
    bucket.todos.push(t);
    buckets.set(g.key, bucket);
  }
  const groups = [...buckets.values()].sort((a, b) => a.order - b.order);
  for (const g of groups) g.todos.sort(g.key === "overdue" ? byDue : byPriorityThenOrder);
  // A single undated group needs no heading.
  if (groups.length === 1 && groups[0].key === "none") groups[0].label = null;
  return groups;
}

export function sortDone(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
}

export function applyFilters(todos: Todo[], priority: PriorityFilter, query: string): Todo[] {
  return todos.filter(
    (t) => (priority === "all" || t.priority === priority) && matchesSearch(t, query),
  );
}

export type Counts = {
  inbox: number;
  today: number;
  overdue: number;
  upcoming: number;
  all: number;
  completed: number;
  lists: { name: string; count: number }[];
  tags: { name: string; count: number }[];
};

/** Open-task counts for the sidebar. Lists/tags keep the casing of their first occurrence. */
export function countViews(todos: Todo[], today: string): Counts {
  const lists = new Map<string, { name: string; count: number }>();
  const tags = new Map<string, { name: string; count: number }>();
  const counts: Counts = {
    inbox: 0,
    today: 0,
    overdue: 0,
    upcoming: 0,
    all: 0,
    completed: 0,
    lists: [],
    tags: [],
  };
  const bump = (map: typeof lists, name: string, open: boolean) => {
    const key = name.toLowerCase();
    const entry = map.get(key) ?? { name, count: 0 };
    if (open) entry.count++;
    map.set(key, entry);
  };
  for (const t of todos) {
    if (t.completed) counts.completed++;
    const open = !t.completed;
    if (open) {
      counts.all++;
      if (t.list_name === null) counts.inbox++;
      if (t.due_date !== null) {
        if (t.due_date <= today) counts.today++;
        if (t.due_date < today) counts.overdue++;
        else if (t.due_date > today) counts.upcoming++;
      }
    }
    if (t.list_name) bump(lists, t.list_name, open);
    for (const tag of t.tags) bump(tags, tag, open);
  }
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  counts.lists = [...lists.values()].sort(byName);
  counts.tags = [...tags.values()].sort(byName);
  return counts;
}

/** Today's progress: how many of today's tasks are already done. */
export function todayProgress(todos: Todo[], today: string): { done: number; total: number } {
  const done = todos.filter((t) => t.completed && completedDay(t) === today).length;
  const open = todos.filter((t) => !t.completed && t.due_date !== null && t.due_date <= today).length;
  return { done, total: done + open };
}
