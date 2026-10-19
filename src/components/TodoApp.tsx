"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDue, nextOccurrence } from "@/lib/dates";
import { useToday } from "@/lib/useToday";
import { orderAfterMove } from "@/lib/order";
import { useGcalStatus } from "@/lib/gcalClient";
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from "@/lib/queries";
import type { Priority, PriorityFilter, SortKey, Todo, TodoPatch, ViewKey } from "@/lib/types";
import {
  applyFilters,
  countViews,
  groupOpen,
  inView,
  sortDone,
  todayProgress,
  viewTitle,
} from "@/lib/views";
import { Composer, type ComposerInput } from "./Composer";
import { EditSheet } from "./EditSheet";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { useToast } from "./Toast";
import { TodoList } from "./TodoList";
import { RemindersPanel, TodayReminders } from "./RemindersPanel";
import { useReminders } from "@/lib/reminderQueries";
import { dueOn } from "@/lib/reminders";

const UNDO_WINDOW_MS = 5000;

const EMPTY_HINTS: Record<string, string> = {
  inbox: "Your inbox is empty. Add a task below to get started.",
  today: "Nothing due today. Enjoy it, or add a task for today.",
  upcoming: "No upcoming tasks. Give a task a due date and it will show up here.",
  all: "Add your first task below.",
  completed: "Finished tasks will show up here.",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
    el.closest("[role=listbox]") !== null
  );
}

export function TodoApp({ email }: { email: string }) {
  const { data, isLoading, isError, error, refetch } = useTodos();
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const remove = useDeleteTodo();
  // Loads the Google Calendar status so task writes know whether to sync.
  useGcalStatus();
  const toast = useToast();
  const today = useToday();

  const [view, setView] = useState<ViewKey>("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Todos waiting out the undo window: hidden from the list, not yet deleted.
  const [pendingDelete, setPendingDelete] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const composerRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const all = useMemo(
    () => (data ?? []).filter((t) => !pendingDelete.has(t.id)),
    [data, pendingDelete],
  );
  const counts = useMemo(() => countViews(all, today), [all, today]);
  const { data: reminders } = useReminders();
  const remindersToday = useMemo(() => dueOn(reminders ?? [], today).length, [reminders, today]);
  const listNames = useMemo(() => counts.lists.map((l) => l.name), [counts.lists]);
  const tagNames = useMemo(() => counts.tags.map((t) => t.name), [counts.tags]);
  const searching = search.trim().length > 0;

  // A search looks through every task, not just the current view.
  const scoped = useMemo(
    () => (searching ? all : all.filter((t) => inView(t, view, today))),
    [all, view, today, searching],
  );
  const matched = useMemo(() => applyFilters(scoped, priority, search), [scoped, priority, search]);
  const open = useMemo(() => matched.filter((t) => !t.completed), [matched]);
  const groups = useMemo(() => groupOpen(open, sort, today), [open, sort, today]);
  const done = useMemo(
    () => (view === "upcoming" && !searching ? [] : sortDone(matched.filter((t) => t.completed))),
    [matched, view, searching],
  );

  const editing = all.find((t) => t.id === editingId) ?? null;
  const progress = view === "today" && !searching ? todayProgress(all, today) : null;
  const showReminders = view === "reminders" && !searching;
  const subtitle = showReminders
    ? `${reminders?.length ?? 0} reminders · ${remindersToday} today`
    : progress
    ? `${progress.done} of ${progress.total} done`
    : `${open.length} active${done.length ? ` · ${done.length} completed` : ""}`;

  const patch = useCallback(
    (id: string, p: TodoPatch) => update.mutate({ id, patch: p }),
    [update],
  );

  const changeView = (v: ViewKey) => {
    setView(v);
    setSearch("");
    setMenuOpen(false);
  };

  const toggle = (t: Todo) => {
    // Finishing a repeating task schedules its next occurrence instead of closing it.
    if (!t.completed && t.repeat && t.due_date) {
      const previous = t.due_date;
      const next = nextOccurrence(previous, t.repeat, today);
      patch(t.id, { due_date: next });
      toast.push({
        message: `Done. Next: ${formatDue(next, today).label}`,
        actionLabel: "Undo",
        onAction: () => patch(t.id, { due_date: previous }),
      });
      return;
    }
    patch(t.id, { completed: !t.completed });
    if (!t.completed) {
      toast.push({
        message: "Task completed",
        actionLabel: "Undo",
        onAction: () => patch(t.id, { completed: false }),
      });
    }
  };

  // Dragging is available when the order is priority-based or manual, on open tasks only.
  const canDrag = (sort === "priority" || sort === "manual") && view !== "completed" && !searching;
  const reorder = (activeId: string, overId: string) => {
    const list = groups[0]?.todos ?? [];
    const active = list.find((t) => t.id === activeId);
    const over = list.find((t) => t.id === overId);
    if (!active || !over) return;
    if (sort === "priority" && active.priority !== over.priority) {
      toast.push({
        message: "In priority order you can reorder within the same priority. Change the priority, or switch to Manual order.",
      });
      return;
    }
    const next = orderAfterMove(list, activeId, overId);
    if (next !== null) patch(activeId, { sort_order: next });
  };

  const add = (input: ComposerInput) => create.mutate({ ...input, id: crypto.randomUUID() });

  const scheduleDelete = (todo: Todo) => {
    setEditingId(null);
    setPendingDelete((prev) => new Set(prev).add(todo.id));
    const finish = (restore: boolean) => {
      const timer = timers.current.get(todo.id);
      if (timer) clearTimeout(timer);
      timers.current.delete(todo.id);
      setPendingDelete((prev) => {
        const next = new Set(prev);
        next.delete(todo.id);
        return next;
      });
      if (!restore) remove.mutate(todo.id);
    };
    timers.current.set(
      todo.id,
      setTimeout(() => finish(false), UNDO_WINDOW_MS),
    );
    toast.push({
      message: "Todo deleted",
      actionLabel: "Undo",
      durationMs: UNDO_WINDOW_MS,
      onAction: () => finish(true),
    });
  };

  const clearCompleted = () => {
    const finished = all.filter((t) => t.completed);
    if (finished.length === 0) return;
    if (!window.confirm(`Permanently delete ${finished.length} completed task(s)?`)) return;
    finished.forEach((t) => remove.mutate(t.id));
  };

  // Keyboard shortcuts: n / q = new task, / = search, Esc = close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || editingId) return;
      if (e.key === "n" || e.key === "q") {
        e.preventDefault();
        composerRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId]);

  const sidebar = (
    <Sidebar view={view} counts={counts} remindersToday={remindersToday} onView={changeView} />
  );

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden border-r border-neutral-200 bg-white md:sticky md:top-0 md:block md:h-dvh md:w-64 md:shrink-0 dark:border-neutral-800 dark:bg-neutral-950">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="anim-fade absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="anim-fade absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl dark:bg-neutral-950"
          >
            {sidebar}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <Toolbar
          ref={searchRef}
          email={email}
          title={searching ? "Search results" : viewTitle(view)}
          subtitle={subtitle}
          progress={progress}
          search={search}
          sort={sort}
          priority={priority}
          onSearch={setSearch}
          onSort={setSort}
          onPriority={setPriority}
          onMenu={() => setMenuOpen(true)}
        />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-60 md:pb-16">
          {showReminders ? (
            <RemindersPanel today={today} />
          ) : (
            <>
              <Composer
                ref={composerRef}
                onAdd={add}
                today={today}
                defaultDue={view === "today" ? today : null}
                defaultList={view.startsWith("list:") ? view.slice(5) : null}
                lists={listNames}
                knownTags={tagNames}
              />
              {view === "today" && !searching && (
                <TodayReminders today={today} onOpen={() => changeView("reminders")} />
              )}
              {isError ? (
                <div role="alert" className="py-8 text-center">
                  <p className="mb-3 text-red-600 dark:text-red-400">
                    Couldn&apos;t load your todos{error instanceof Error ? `: ${error.message}` : ""}.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="min-h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <TodoList
                    key={`${view}|${searching}`}
                    groups={groups}
                    done={done}
                    loading={isLoading}
                    today={today}
                    showList={!view.startsWith("list:")}
                    filtered={searching || priority !== "all"}
                    emptyHint={EMPTY_HINTS[view] ?? "Add a task below to put it in this list."}
                    onToggle={toggle}
                    onOpen={(t) => setEditingId(t.id)}
                    onPriority={(t, p: Priority) => patch(t.id, { priority: p })}
                    draggable={canDrag}
                    onReorder={reorder}
                  />
                  {view === "completed" && done.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCompleted}
                      className="mt-4 min-h-11 rounded-xl border border-red-600 px-4 text-sm font-semibold text-red-600 dark:border-red-400 dark:text-red-400"
                    >
                      Delete all completed
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {editing && (
        <EditSheet
          key={editing.id}
          todo={editing}
          today={today}
          lists={listNames}
          onClose={() => setEditingId(null)}
          onSave={(p) => {
            patch(editing.id, p);
            setEditingId(null);
          }}
          onDelete={() => scheduleDelete(editing)}
        />
      )}
    </div>
  );
}
