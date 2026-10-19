"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { formatLongDate, parseISODate } from "@/lib/dates";
import { monthGrid, monthStats, taskStatus, type TaskStatus } from "@/lib/calendar";
import { PRIORITY_DOT, PRIORITY_RING, PRIORITY_STYLES } from "@/lib/palette";
import { sortDigest } from "@/lib/digest";
import type { Todo } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CHIP: Record<TaskStatus, string> = {
  done: "bg-green-100 text-green-800 line-through opacity-80 dark:bg-green-500/20 dark:text-green-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  pending: "bg-indigo-50 text-neutral-800 dark:bg-indigo-500/15 dark:text-neutral-100",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  done: "Done",
  overdue: "Overdue",
  pending: "Pending",
};

export function CalendarView({ todos, today }: { todos: Todo[]; today: string }) {
  const now = parseISODate(today);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(today);

  const weeks = useMemo(
    () => monthGrid(cursor.year, cursor.month, today, todos),
    [cursor, today, todos],
  );
  const stats = useMemo(
    () => monthStats(todos, cursor.year, cursor.month, today),
    [todos, cursor, today],
  );
  const selectedDay = weeks.flat().find((d) => d.date === selected) ?? null;
  const selectedTodos = selectedDay ? sortDigest(selectedDay.todos) : [];

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(null);
  };

  const goToday = () => {
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(today);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Done" value={stats.done} tone="text-green-700 dark:text-green-400" />
        <Stat label="Pending" value={stats.pending} tone="text-indigo-700 dark:text-indigo-300" />
        <Stat label="Overdue" value={stats.overdue} tone="text-red-700 dark:text-red-400" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" aria-live="polite">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToday}
            className="min-h-10 rounded-xl border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="grid size-10 place-items-center rounded-xl border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="grid size-10 place-items-center rounded-xl border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div role="grid" aria-label={monthLabel} className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div role="row" className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-100 text-center text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          {WEEKDAYS.map((d) => (
            <div key={d} role="columnheader" className="py-2">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].date} role="row" className="grid grid-cols-7">
            {week.map((day) => {
              const sorted = sortDigest(day.todos);
              const isSelected = day.date === selected;
              const dayNum = parseISODate(day.date).getDate();
              return (
                <button
                  key={day.date}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${formatLongDate(day.date)}, ${day.todos.length} ${day.todos.length === 1 ? "task" : "tasks"}`}
                  onClick={() => setSelected(day.date)}
                  className={`flex min-h-16 flex-col items-stretch gap-1 border-t border-l border-neutral-200 p-1 text-left first:border-l-0 sm:min-h-28 sm:p-1.5 dark:border-neutral-800 [&:nth-child(7n+1)]:border-l-0 ${
                    day.inMonth ? "bg-white dark:bg-neutral-950" : "bg-neutral-50 text-neutral-400 dark:bg-neutral-900/50"
                  } ${isSelected ? "ring-2 ring-indigo-500 ring-inset" : "hover:bg-indigo-50/60 dark:hover:bg-neutral-900"}`}
                >
                  <span
                    className={`grid size-6 place-items-center self-start rounded-full text-xs font-medium ${
                      day.isToday ? "bg-indigo-600 font-bold text-white" : ""
                    }`}
                  >
                    {dayNum}
                  </span>
                  {/* Phones: coloured dots. Larger screens: short task chips. */}
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {sorted.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        aria-hidden="true"
                        className={`size-2 rounded-full ${
                          t.completed ? "bg-green-500" : taskStatus(t, today) === "overdue" ? "bg-red-500" : PRIORITY_DOT[t.priority]
                        }`}
                      />
                    ))}
                  </span>
                  <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                    {sorted.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className={`truncate rounded border-l-[3px] px-1 py-0.5 text-[11px] leading-tight ${PRIORITY_RING[t.priority]} ${CHIP[taskStatus(t, today)]}`}
                      >
                        {t.title}
                      </span>
                    ))}
                    {sorted.length > 3 && (
                      <span className="px-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        +{sorted.length - 3} more
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-green-500" aria-hidden="true" /> Done
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-indigo-500" aria-hidden="true" /> Pending (colour = priority)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" aria-hidden="true" /> Overdue
        </li>
      </ul>

      {selectedDay && (
        <section aria-label="Selected day" className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-2 font-semibold">{formatLongDate(selectedDay.date)}</h3>
          {selectedTodos.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No tasks on this day.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {selectedTodos.map((t) => {
                const status = taskStatus(t, today);
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <span
                      aria-hidden="true"
                      className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                        t.completed ? "border-green-600 bg-green-600 text-white" : PRIORITY_RING[t.priority]
                      }`}
                    >
                      {t.completed && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={`min-w-0 flex-1 break-words text-sm ${t.completed ? "text-neutral-500 line-through" : ""}`}>
                      {t.title}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{STATUS_LABEL[status]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PRIORITY_STYLES[t.priority].cls}`}>
                      {PRIORITY_STYLES[t.priority].label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label} this month</p>
    </div>
  );
}
