"use client";

import { useMemo, useState } from "react";
import { Bell, BellOff, ChevronDown, Pencil, Plus, Repeat2, Trash2 } from "lucide-react";
import { formatDue, formatLongDate } from "@/lib/dates";
import {
  REMINDER_SCHEDULES,
  SCHEDULE_LABELS,
  WEEKDAY_SHORT,
  describeSchedule,
  dueOn,
  nextDueDate,
  reminderSchema,
  sortReminders,
  type Reminder,
  type ReminderInput,
  type ReminderSchedule,
} from "@/lib/reminders";
import { useDeleteReminder, useReminders, useSaveReminder } from "@/lib/reminderQueries";
import { Dropdown, type DropdownOption } from "./Dropdown";
import { useToast } from "./Toast";

const SCHEDULE_OPTIONS: DropdownOption<ReminderSchedule>[] = REMINDER_SCHEDULES.map((s) => ({
  value: s,
  label: SCHEDULE_LABELS[s],
}));

// Mon-first chip order reads more naturally; values stay 0 = Sunday.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const field =
  "min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-950";

const IDEAS = ["Take medicines", "Go to the gym", "Water the plants", "Drink water", "Call family"];

function blank(today: string): ReminderInput {
  return { id: crypto.randomUUID(), text: "", schedule: "daily", days_of_week: [], on_date: today, active: true };
}

function ReminderForm({
  initial,
  today,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ReminderInput;
  today: string;
  submitLabel: string;
  onSubmit: (r: ReminderInput) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<ReminderInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ReminderInput>) => setDraft((d) => ({ ...d, ...patch }));
  const needsDate = draft.schedule === "monthly" || draft.schedule === "yearly" || draft.schedule === "once";
  const prefix = initial.id.slice(0, 8);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = reminderSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reminder");
      return;
    }
    setError(null);
    onSubmit(draft);
  };

  const toggleDay = (d: number) =>
    set({
      days_of_week: draft.days_of_week.includes(d)
        ? draft.days_of_week.filter((x) => x !== d)
        : [...draft.days_of_week, d],
    });

  return (
    <form onSubmit={submit} className="space-y-3" aria-label={submitLabel === "Add" ? "New reminder" : "Edit reminder"}>
      <div>
        <label htmlFor={`${prefix}-text`} className="sr-only">
          Reminder
        </label>
        <input
          id={`${prefix}-text`}
          value={draft.text}
          maxLength={200}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="Remind me to…"
          aria-invalid={error ? true : undefined}
          className={field}
        />
      </div>
      {!draft.text && submitLabel === "Add" && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reminder ideas">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => set({ text: idea })}
              className="min-h-9 rounded-full border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {idea}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <Dropdown
          label="How often"
          title="How often"
          value={draft.schedule}
          options={SCHEDULE_OPTIONS}
          onChange={(schedule) => set({ schedule, on_date: draft.on_date ?? today })}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-950"
        >
          <Repeat2 size={16} aria-hidden="true" className="text-neutral-500" />
          <span>{SCHEDULE_LABELS[draft.schedule]}</span>
          <ChevronDown size={15} aria-hidden="true" className="text-neutral-500" />
        </Dropdown>
        {needsDate && (
          <div>
            <label htmlFor={`${prefix}-date`} className="sr-only">
              {draft.schedule === "once" ? "Date" : "Starting date"}
            </label>
            <input
              id={`${prefix}-date`}
              type="date"
              value={draft.on_date ?? ""}
              onChange={(e) => set({ on_date: e.target.value || null })}
              className={`${field} w-auto`}
            />
          </div>
        )}
      </div>
      {draft.schedule === "weekly" && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
          {DAY_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={draft.days_of_week.includes(d)}
              onClick={() => toggleDay(d)}
              className="grid size-11 place-items-center rounded-full border border-neutral-300 text-sm font-semibold aria-pressed:border-indigo-600 aria-pressed:bg-indigo-600 aria-pressed:text-white dark:border-neutral-700 dark:aria-pressed:border-indigo-500 dark:aria-pressed:bg-indigo-500"
            >
              {WEEKDAY_SHORT[d]}
            </button>
          ))}
        </div>
      )}
      {draft.text.trim() && (!needsDate || draft.on_date) && (draft.schedule !== "weekly" || draft.days_of_week.length > 0) && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{describeSchedule(draft)}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700"
        >
          {submitLabel === "Add" && <Plus size={16} aria-hidden="true" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl bg-neutral-200 px-5 font-semibold dark:bg-neutral-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function nextLabel(r: Reminder, today: string): string {
  if (!r.active) return "Paused";
  const next = nextDueDate(r, today);
  if (!next) return r.schedule === "once" ? "Done" : "No upcoming date";
  return `Next: ${formatDue(next, today).label}`;
}

function Row({
  reminder,
  today,
  dueToday,
  onEdit,
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  today: string;
  dueToday: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`flex min-h-14 items-center gap-2 border-b border-neutral-200 py-2 dark:border-neutral-800 ${reminder.active ? "" : "opacity-60"}`}>
      <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          dueToday ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
        }`}
      >
        {reminder.active ? <Bell size={16} /> : <BellOff size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words">{reminder.text}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {describeSchedule(reminder)} · {dueToday ? "Today" : nextLabel(reminder, today)}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={reminder.active}
        aria-label={`${reminder.active ? "Pause" : "Resume"}: ${reminder.text}`}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${reminder.active ? "bg-indigo-600" : "bg-neutral-300 dark:bg-neutral-700"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${reminder.active ? "translate-x-5" : ""}`}
        />
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit reminder: ${reminder.text}`}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete reminder: ${reminder.text}`}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

/** The "Reminders" section: add, edit, pause and delete recurring reminders. */
export function RemindersPanel({ today }: { today: string }) {
  const { data, isLoading, isError, error, refetch } = useReminders();
  const { save } = useSaveReminder();
  const { remove } = useDeleteReminder();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const reminders = useMemo(() => sortReminders(data ?? [], today), [data, today]);
  const todays = useMemo(() => dueOn(reminders, today), [reminders, today]);
  const todayIds = useMemo(() => new Set(todays.map((r) => r.id)), [todays]);

  const asInput = (r: Reminder): ReminderInput => ({
    id: r.id,
    text: r.text,
    schedule: r.schedule,
    days_of_week: r.days_of_week,
    on_date: r.on_date,
    active: r.active,
  });

  const onDelete = (r: Reminder) => {
    remove(r.id);
    toast.push({
      message: "Reminder deleted",
      actionLabel: "Undo",
      durationMs: 5000,
      onAction: () => save(asInput(r)),
    });
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="new-reminder-heading" className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 id="new-reminder-heading" className="mb-1 font-semibold">
          New reminder
        </h2>
        <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
          Short notes for things you do regularly. They show here on the days they&apos;re due and in your morning
          email, together with your tasks.
        </p>
        <ReminderForm
          key={formKey}
          initial={blank(today)}
          today={today}
          submitLabel="Add"
          onSubmit={(r) => {
            save(r);
            setFormKey((k) => k + 1);
          }}
        />
      </section>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      ) : isError ? (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <p>Couldn&apos;t load reminders{error instanceof Error ? `: ${error.message}` : ""}.</p>
          <button type="button" onClick={() => refetch()} className="mt-2 min-h-10 font-semibold underline">
            Retry
          </button>
        </div>
      ) : reminders.length === 0 ? (
        <p className="py-10 text-center text-neutral-500 dark:text-neutral-400">
          No reminders yet. Add one above, like &ldquo;Take medicines&rdquo; every day.
        </p>
      ) : (
        <>
          <section aria-label="Due today">
            <h2 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              Today · {formatLongDate(today)}
            </h2>
            {todays.length === 0 ? (
              <p className="py-2 text-sm text-neutral-500 dark:text-neutral-400">Nothing to remember today.</p>
            ) : (
              <ul className="space-y-1.5">
                {todays.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    <Bell size={15} aria-hidden="true" className="shrink-0" />
                    <span className="break-words">{r.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="All reminders">
            <h2 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              All reminders ({reminders.length})
            </h2>
            <ul>
              {reminders.map((r) =>
                editingId === r.id ? (
                  <li key={r.id} className="border-b border-neutral-200 py-3 dark:border-neutral-800">
                    <ReminderForm
                      initial={asInput(r)}
                      today={today}
                      submitLabel="Save"
                      onSubmit={(next) => {
                        save(next);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <Row
                    key={r.id}
                    reminder={r}
                    today={today}
                    dueToday={todayIds.has(r.id)}
                    onEdit={() => setEditingId(r.id)}
                    onToggle={() => save({ ...asInput(r), active: !r.active })}
                    onDelete={() => onDelete(r)}
                  />
                ),
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

/** Compact card for the Today view; renders nothing when no reminder is due. */
export function TodayReminders({ today, onOpen }: { today: string; onOpen: () => void }) {
  const { data } = useReminders();
  const todays = useMemo(() => dueOn(data ?? [], today), [data, today]);
  if (todays.length === 0) return null;
  return (
    <section aria-label="Today's reminders" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
          <Bell size={15} aria-hidden="true" />
          Reminders for today
        </h2>
        <button type="button" onClick={onOpen} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/20">
          Manage
        </button>
      </div>
      <ul className="space-y-0.5 text-sm text-amber-900 dark:text-amber-100">
        {todays.map((r) => (
          <li key={r.id} className="break-words">
            • {r.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
