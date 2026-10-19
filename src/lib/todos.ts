import { createClient } from "@/lib/supabase/client";
import { newTodoSchema, todoPatchSchema } from "@/lib/schema";
import type { NewTodo, Todo, TodoPatch } from "@/lib/types";

const TABLE = "todos";

/** Rows saved before the v2 migration lack the newer columns; fill in the defaults. */
export function normalizeTodo(row: Partial<Todo> & Record<string, unknown>): Todo {
  return {
    ...(row as Todo),
    due_date: row.due_date ?? null,
    list_name: row.list_name ?? null,
    tags: row.tags ?? [],
    subtasks: row.subtasks ?? [],
    repeat: row.repeat ?? null,
    sort_order: row.sort_order ?? null,
  };
}

function fail(message: string): never {
  if (/schema cache|column .* does not exist/i.test(message)) {
    throw new Error("Database needs the latest update: run supabase/migrations/0002_features.sql");
  }
  throw new Error(message);
}

export async function listTodos(): Promise<Todo[]> {
  const { data, error } = await createClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fail(error.message);
  return (data ?? []).map(normalizeTodo);
}

export async function createTodo(input: NewTodo): Promise<Todo> {
  const parsed = newTodoSchema.parse(input);
  const { data, error } = await createClient().from(TABLE).insert(parsed).select().single();
  if (error) fail(error.message);
  return normalizeTodo(data);
}

export async function updateTodo(id: string, patch: TodoPatch): Promise<Todo> {
  const parsed = todoPatchSchema.parse(patch);
  const { data, error } = await createClient()
    .from(TABLE)
    .update(parsed)
    .eq("id", id)
    .select()
    .single();
  if (error) fail(error.message);
  return normalizeTodo(data);
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await createClient().from(TABLE).delete().eq("id", id);
  if (error) fail(error.message);
}
