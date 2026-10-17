import { CalendarDays, Check, FileText, Hash, ListChecks, Repeat } from "lucide-react";
import { formatDue, type DueTone } from "@/lib/dates";
import { HIGHLIGHT_COLORS, PRIORITY_RING, TEXT_COLORS } from "@/lib/palette";
import type { Priority, Todo } from "@/lib/types";
import { PriorityBadge } from "./PriorityBadge";

type Props = {
  todo: Todo;
  today: string;
  /** Show the list name chip (hidden inside that list's own view). */
  showList: boolean;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  onPriority: (todo: Todo, p: Priority) => void;
};

const TONES: Record<DueTone, string> = {
  overdue: "text-red-600 dark:text-red-400",
  today: "text-green-700 dark:text-green-400",
  soon: "text-orange-600 dark:text-orange-400",
  later: "text-neutral-500 dark:text-neutral-400",
};

const meta = "inline-flex items-center gap-1";

export function TodoRow({ todo, today, showList, onToggle, onOpen, onPriority }: Props) {
  const titleClasses = [
    "box-decoration-clone rounded px-1 py-0.5 break-words",
    todo.text_color ? TEXT_COLORS[todo.text_color] : "",
    todo.highlight_color ? HIGHLIGHT_COLORS[todo.highlight_color] : "",
    todo.completed ? "line-through" : "",
  ].join(" ");

  const due = todo.due_date ? formatDue(todo.due_date, today) : null;
  const doneSubtasks = todo.subtasks.filter((s) => s.done).length;
  const hasMeta =
    due || todo.repeat || todo.subtasks.length > 0 || todo.notes || todo.tags.length > 0 ||
    (showList && todo.list_name);

  return (
    <li
      className={`group flex items-start gap-1 rounded-xl px-1 py-0.5 transition-colors hover:bg-white dark:hover:bg-neutral-900 ${
        todo.completed ? "opacity-60" : ""
      }`}
    >
      <label className="relative grid size-11 shrink-0 cursor-pointer place-items-center">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo)}
          aria-label={`${todo.completed ? "Mark as not done" : "Mark as done"}: ${todo.title}`}
          className={`peer size-6 cursor-pointer appearance-none rounded-full border-2 bg-transparent transition-colors checked:border-indigo-600 checked:bg-indigo-600 ${PRIORITY_RING[todo.priority]}`}
        />
        <Check
          size={14}
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100"
        />
      </label>
      <button
        type="button"
        onClick={() => onOpen(todo)}
        aria-label={`Edit: ${todo.title}`}
        className="min-h-11 min-w-0 flex-1 py-2 text-left text-base leading-snug"
      >
        <span className={titleClasses}>{todo.title}</span>
        {hasMeta && (
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-xs text-neutral-500 dark:text-neutral-400">
            {due && (
              <span className={`${meta} font-medium ${TONES[due.tone]}`}>
                <CalendarDays size={12} aria-hidden="true" />
                {due.label}
              </span>
            )}
            {todo.repeat && (
              <span className={meta} title={`Repeats ${todo.repeat}`}>
                <Repeat size={12} aria-hidden="true" />
                <span className="sr-only">Repeats {todo.repeat}</span>
              </span>
            )}
            {todo.subtasks.length > 0 && (
              <span className={meta}>
                <ListChecks size={12} aria-hidden="true" />
                {doneSubtasks}/{todo.subtasks.length}
              </span>
            )}
            {todo.notes && (
              <span className={meta}>
                <FileText size={12} aria-hidden="true" />
                <span className="sr-only">Has notes</span>
              </span>
            )}
            {showList && todo.list_name && (
              <span className={meta}>
                <Hash size={12} aria-hidden="true" />
                {todo.list_name}
              </span>
            )}
            {todo.tags.map((t) => (
              <span key={t}>@{t}</span>
            ))}
          </span>
        )}
      </button>
      <div className="flex min-h-11 items-center">
        <PriorityBadge
          priority={todo.priority}
          onChange={(p) => onPriority(todo, p)}
          label={`Change priority of ${todo.title}`}
        />
      </div>
    </li>
  );
}
