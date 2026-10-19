import { createClient } from "@/lib/supabase/client";
import { cleanReminder, reminderSchema, type Reminder, type ReminderInput } from "@/lib/reminders";

// Database calls for reminders (RLS limits everything to the signed-in user).
// Components use the hooks in reminderQueries.ts instead of calling these directly.

const TABLE = "reminders";

function fail(message: string): never {
  if (/schema cache|does not exist/i.test(message)) {
    throw new Error(
      "Database needs the latest update: run supabase/migrations/0005_reminders_and_quotes.sql",
    );
  }
  throw new Error(message);
}

function normalize(row: Partial<Reminder> & Record<string, unknown>): Reminder {
  return {
    ...(row as Reminder),
    days_of_week: (row.days_of_week ?? []).map(Number),
    on_date: row.on_date ?? null,
    active: row.active ?? true,
  };
}

export async function listReminders(): Promise<Reminder[]> {
  const { data, error } = await createClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(error.message);
  return (data ?? []).map(normalize);
}

/** Insert or update (the id is generated on the client, like tasks). */
export async function saveReminder(input: ReminderInput): Promise<Reminder> {
  const parsed = reminderSchema.parse(cleanReminder(input));
  const { data, error } = await createClient()
    .from(TABLE)
    .upsert(parsed, { onConflict: "id" })
    .select()
    .single();
  if (error) fail(error.message);
  return normalize(data);
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await createClient().from(TABLE).delete().eq("id", id);
  if (error) fail(error.message);
}
