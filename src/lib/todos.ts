import { createClient } from "@/lib/supabase/client";
import { newTodoSchema, todoPatchSchema } from "@/lib/schema";
import type { NewTodo, Todo, TodoPatch } from "@/lib/types";

const TABLE = "todos";

export async function listTodos(): Promise<Todo[]> {
  const { data, error } = await createClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Todo[];
}

export async function createTodo(input: NewTodo): Promise<Todo> {
  const parsed = newTodoSchema.parse(input);
  const { data, error } = await createClient().from(TABLE).insert(parsed).select().single();
  if (error) throw new Error(error.message);
  return data as Todo;
}

export async function updateTodo(id: string, patch: TodoPatch): Promise<Todo> {
  const parsed = todoPatchSchema.parse(patch);
  const { data, error } = await createClient()
    .from(TABLE)
    .update(parsed)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Todo;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await createClient().from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
