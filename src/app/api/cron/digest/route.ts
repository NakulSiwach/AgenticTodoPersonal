import { authorizedCron as authorized } from "@/lib/cronAuth";
import { buildDigest, shouldSendDigest, type DigestTodo } from "@/lib/digest";
import { loadDigestExtras } from "@/lib/digestExtras";
import { appBaseUrl, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

// Called every ~15 minutes by a scheduler (.github/workflows/daily-digest.yml).
// For each user whose chosen time has just passed, emails today's pending tasks once per day.

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  email_digest_enabled: boolean;
  email_digest_time: string;
  timezone: string;
  last_digest_date: string | null;
  /** Missing until migration 0005 is applied; treated as on. */
  digest_quote_enabled?: boolean;
};

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }

  const { data, error } = await admin.from("profiles").select("*").eq("email_digest_enabled", true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const result = { checked: 0, sent: 0, skipped: 0, failed: 0 };

  for (const p of (data ?? []) as ProfileRow[]) {
    result.checked++;
    const { send, today } = shouldSendDigest(
      {
        enabled: p.email_digest_enabled,
        time: p.email_digest_time,
        timezone: p.timezone,
        lastDigestDate: p.last_digest_date,
      },
      now,
    );
    if (!send) {
      result.skipped++;
      continue;
    }

    // Claim today's slot first so two overlapping runs can never email the same person twice.
    const { data: claimed } = await admin
      .from("profiles")
      .update({ last_digest_date: today })
      .eq("user_id", p.user_id)
      .or(`last_digest_date.is.null,last_digest_date.neq.${today}`)
      .select("user_id");
    if (!claimed || claimed.length === 0) {
      result.skipped++;
      continue;
    }

    const release = () =>
      admin.from("profiles").update({ last_digest_date: p.last_digest_date }).eq("user_id", p.user_id);

    try {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(p.user_id);
      const email = userData?.user?.email;
      if (userError || !email) throw new Error("No email address for user");

      const { data: todos, error: todoError } = await admin
        .from("todos")
        .select("title,priority,due_date,list_name,tags,subtasks,notes")
        .eq("user_id", p.user_id)
        .eq("completed", false)
        .lte("due_date", today);
      if (todoError) throw new Error(todoError.message);

      const extras = await loadDigestExtras(admin, {
        today,
        userId: p.user_id,
        quoteEnabled: p.digest_quote_enabled !== false,
      });

      if ((!todos || todos.length === 0) && extras.reminders.length === 0) {
        result.skipped++; // nothing pending and nothing to remember: stay quiet
        continue;
      }

      const digest = buildDigest({
        name: p.display_name ?? "",
        todos: (todos ?? []).map((t) => ({ ...t, tags: t.tags ?? [], subtasks: t.subtasks ?? [] })) as DigestTodo[],
        today,
        appUrl: appBaseUrl(),
        reminders: extras.reminders,
        quote: extras.quote,
      });
      await sendEmail({ to: email, subject: digest.subject, html: digest.html, text: digest.text });
      result.sent++;
    } catch (e) {
      await release(); // let the next run retry inside the send window
      result.failed++;
      console.error("digest failed for a user:", (e as Error).message);
    }
  }

  return Response.json(result);
}
