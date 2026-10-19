"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, PartyPopper, SearchX } from "lucide-react";
import type { Group } from "@/lib/views";
import type { Priority, Todo } from "@/lib/types";
import { TodoRow } from "./TodoRow";

type RowHandlers = {
  today: string;
  showList: boolean;
  onToggle: (todo: Todo) => void;
  onOpen: (todo: Todo) => void;
  onPriority: (todo: Todo, p: Priority) => void;
};

type Props = RowHandlers & {
  groups: Group[];
  done: Todo[];
  loading: boolean;
  /** True when a search or priority filter is hiding tasks. */
  filtered: boolean;
  emptyHint: string;
  /** Show drag handles on open tasks. */
  draggable: boolean;
  onReorder: (activeId: string, overId: string) => void;
};

function SortableRow({ todo, ...handlers }: RowHandlers & { todo: Todo }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  return (
    <TodoRow
      todo={todo}
      {...handlers}
      liRef={setNodeRef}
      liStyle={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      dragHandle={
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder: ${todo.title}`}
          title="Drag to reorder"
          className="grid size-11 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-neutral-300 hover:text-neutral-600 active:cursor-grabbing dark:text-neutral-600 dark:hover:text-neutral-300"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      }
    />
  );
}

function SortableGroup({
  todos,
  onReorder,
  ...handlers
}: RowHandlers & { todos: Todo[]; onReorder: (activeId: string, overId: string) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul>
          {todos.map((t) => (
            <SortableRow key={t.id} todo={t} {...handlers} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export function TodoList({
  groups,
  done,
  loading,
  today,
  showList,
  filtered,
  emptyHint,
  draggable,
  onReorder,
  onToggle,
  onOpen,
  onPriority,
}: Props) {
  const [showDone, setShowDone] = useState(true);

  if (loading) {
    return (
      <ul aria-busy="true" aria-label="Loading todos" className="space-y-2 py-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-12 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </ul>
    );
  }

  const rowProps: RowHandlers = { today, showList, onToggle, onOpen, onPriority };
  const empty = groups.length === 0 && done.length === 0;

  if (empty) {
    const Icon = filtered ? SearchX : PartyPopper;
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-neutral-500 dark:text-neutral-400">
        <Icon size={40} aria-hidden="true" className="text-indigo-500" />
        <p className="text-base font-medium text-neutral-800 dark:text-neutral-200">
          {filtered ? "No matching tasks" : "Nothing to do"}
        </p>
        <p className="max-w-xs text-sm">{filtered ? "Try a different search or filter." : emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label ?? "Tasks"}>
          {g.label && (
            <h3
              className={`mb-1 flex items-baseline gap-2 border-b border-neutral-200 px-1 pb-1 text-sm font-semibold dark:border-neutral-800 ${
                g.key === "overdue" ? "text-red-600 dark:text-red-400" : ""
              }`}
            >
              {g.label}
              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {g.todos.length}
              </span>
            </h3>
          )}
          {draggable ? (
            <SortableGroup todos={g.todos} onReorder={onReorder} {...rowProps} />
          ) : (
            <ul>
              {g.todos.map((t) => (
                <TodoRow key={t.id} todo={t} {...rowProps} />
              ))}
            </ul>
          )}
        </section>
      ))}
      {done.length > 0 && (
        <section aria-label="Completed tasks">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex min-h-11 w-full items-center gap-1 rounded-lg px-1 text-sm font-semibold text-neutral-600 dark:text-neutral-300"
          >
            <ChevronRight
              size={16}
              aria-hidden="true"
              className={`transition-transform ${showDone ? "rotate-90" : ""}`}
            />
            Completed
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {done.length}
            </span>
          </button>
          {showDone && (
            <ul>
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} {...rowProps} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
