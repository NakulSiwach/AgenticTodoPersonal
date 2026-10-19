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

export const REPEATS = ["daily", "weekdays", "weekly", "monthly", "yearly"] as const;
export type Repeat = (typeof REPEATS)[number];

export type Subtask = { id: string; title: string; done: boolean };

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
  /** Local calendar date, `YYYY-MM-DD`. */
  due_date: string | null;
  /** Null means the Inbox. */
  list_name: string | null;
  tags: string[];
  subtasks: Subtask[];
  repeat: Repeat | null;
  /** Manual position (smaller = earlier). Null means the default order. */
  sort_order: number | null;
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
  due_date?: string | null;
  list_name?: string | null;
  tags?: string[];
  subtasks?: Subtask[];
  repeat?: Repeat | null;
};

export type TodoPatch = Partial<
  Pick<
    Todo,
    | "title"
    | "notes"
    | "priority"
    | "completed"
    | "text_color"
    | "highlight_color"
    | "due_date"
    | "list_name"
    | "tags"
    | "subtasks"
    | "repeat"
    | "sort_order"
  >
>;

export type PriorityFilter = "all" | Priority;
export type SortKey = "priority" | "manual" | "smart" | "due" | "newest" | "alpha";

export type Profile = {
  display_name: string | null;
  /** Quote of the day at the bottom of the daily email. */
  digest_quote_enabled: boolean;
  email_digest_enabled: boolean;
  /** Local time, `HH:MM`. */
  email_digest_time: string;
  timezone: string;
};
/** `inbox | today | upcoming | all | completed`, `list:<name>` or `tag:<name>`. */
export type ViewKey = string;
