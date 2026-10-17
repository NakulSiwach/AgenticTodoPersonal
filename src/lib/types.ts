export const PRIORITIES = [0, 1, 2, 3, 4] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TEXT_COLOR_KEYS = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
] as const;
export type TextColorKey = (typeof TEXT_COLOR_KEYS)[number];

export const HIGHLIGHT_COLOR_KEYS = ["yellow", "green", "blue", "pink", "orange", "purple"] as const;
export type HighlightKey = (typeof HIGHLIGHT_COLOR_KEYS)[number];

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  priority: Priority;
  completed: boolean;
  completed_at: string | null;
  text_color: TextColorKey | null;
  highlight_color: HighlightKey | null;
  created_at: string;
  updated_at: string;
};

export type NewTodo = {
  /** Client-generated so the optimistic row keeps the same identity once saved. */
  id: string;
  title: string;
  priority: Priority;
  notes?: string | null;
  text_color?: TextColorKey | null;
  highlight_color?: HighlightKey | null;
};

export type TodoPatch = Partial<
  Pick<Todo, "title" | "notes" | "priority" | "completed" | "text_color" | "highlight_color">
>;

export type StatusFilter = "all" | "active" | "completed";
export type PriorityFilter = "all" | Priority;
