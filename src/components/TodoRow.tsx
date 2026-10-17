import { HIGHLIGHT_COLORS, TEXT_COLORS } from "@/lib/palette";
import type { Priority, Todo } from "@/lib/types";
import { PriorityBadge } from "./PriorityBadge";

type Props = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  onPriority: (todo: Todo, p: Priority) => void;
};

export function TodoRow({ todo, onToggle, onOpen, onPriority }: Props) {
  const titleClasses = [
    "box-decoration-clone rounded px-1 py-0.5 break-words",
    todo.text_color ? TEXT_COLORS[todo.text_color] : "",
    todo.highlight_color ? HIGHLIGHT_COLORS[todo.highlight_color] : "",
    todo.completed ? "line-through" : "",
  ].join(" ");

  return (
    <li
      className={`flex min-h-14 items-center gap-1 border-b border-neutral-200 py-1 dark:border-neutral-800 ${
        todo.completed ? "opacity-60" : ""
      }`}
    >
      <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo)}
          aria-label={`${todo.completed ? "Mark as not done" : "Mark as done"}: ${todo.title}`}
          className="size-6 cursor-pointer accent-indigo-600"
        />
      </label>
      <button
        type="button"
        onClick={() => onOpen(todo)}
        aria-label={`Edit: ${todo.title}`}
        className="min-h-11 flex-1 px-1 text-left text-base leading-snug"
      >
        <span className={titleClasses}>{todo.title}</span>
        {todo.notes && (
          <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
            {todo.notes}
          </span>
        )}
      </button>
      <PriorityBadge
        priority={todo.priority}
        onChange={(p) => onPriority(todo, p)}
        label={`Change priority of ${todo.title}`}
      />
    </li>
  );
}
