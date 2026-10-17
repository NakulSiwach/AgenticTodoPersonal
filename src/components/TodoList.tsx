import type { Priority, Todo } from "@/lib/types";
import { TodoRow } from "./TodoRow";

type Props = {
  todos: Todo[];
  loading: boolean;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  onPriority: (todo: Todo, p: Priority) => void;
};

export function TodoList({ todos, loading, onToggle, onOpen, onPriority }: Props) {
  if (loading) {
    return (
      <ul aria-busy="true" aria-label="Loading todos" className="space-y-2 py-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-12 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </ul>
    );
  }
  if (todos.length === 0) {
    return (
      <p className="py-16 text-center text-neutral-500 dark:text-neutral-400">Nothing to do 🎉</p>
    );
  }
  return (
    <ul>
      {todos.map((t) => (
        <TodoRow key={t.id} todo={t} onToggle={onToggle} onOpen={onOpen} onPriority={onPriority} />
      ))}
    </ul>
  );
}
