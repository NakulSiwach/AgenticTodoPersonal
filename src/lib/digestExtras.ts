// Server-side: the extra parts of the daily email (today's reminders and the quote of the day).
// Works with either the signed-in user's client (RLS scopes it) or the admin client + userId.
import type { SupabaseClient } from "@supabase/supabase-js";
import { quoteForDate, type Quote } from "./quotes";
import { dueOn, type Reminder } from "./reminders";

type ReminderRow = Pick<Reminder, "text" | "schedule" | "days_of_week" | "on_date" | "active">;

export async function loadDigestExtras(
  db: SupabaseClient,
  { today, quoteEnabled, userId }: { today: string; quoteEnabled: boolean; userId?: string },
): Promise<{ reminders: string[]; quote: Quote | null }> {
  let query = db
    .from("reminders")
    .select("text,schedule,days_of_week,on_date,active")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) {
    // e.g. migration 0005 not applied yet: send the email without reminders rather than failing.
    console.warn("digest: reminders unavailable:", error.message);
  }
  const rows = ((error ? [] : data) ?? []) as ReminderRow[];
  const reminders = dueOn(
    rows.map((r) => ({ ...r, days_of_week: (r.days_of_week ?? []).map(Number) })),
    today,
  ).map((r) => r.text);
  return { reminders, quote: quoteEnabled ? quoteForDate(today) : null };
}
