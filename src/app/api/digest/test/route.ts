import { buildDigest, type DigestTodo } from "@/lib/digest";
import { localClock } from "@/lib/dates";
import { appBaseUrl, EmailNotConfiguredError, sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

// "Send me a test email now" button on the Profile page. Runs as the signed-in user, so it
// only ever reads that user's own rows (row-level security) and emails their own address.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return Response.json({ error: "Not signed in" }, { status: 401 });

  let timezone = "UTC";
  try {
    const body = (await request.json()) as { timezone?: unknown };
    if (typeof body.timezone === "string" && body.timezone.length <= 64) timezone = body.timezone;
  } catch {
    /* no body: fall back to UTC */
  }

  const { data: profile } = await supabase.from("profiles").select("display_name").maybeSingle();
  const today = localClock(new Date(), timezone).date;

  const { data: todos, error } = await supabase
    .from("todos")
    .select("title,priority,due_date,list_name,tags,subtasks,notes")
    .eq("completed", false)
    .lte("due_date", today);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const digest = buildDigest({
    name: profile?.display_name ?? "",
    todos: (todos ?? []).map((t) => ({ ...t, tags: t.tags ?? [], subtasks: t.subtasks ?? [] })) as DigestTodo[],
    today,
    appUrl: appBaseUrl(),
  });

  try {
    await sendEmail({
      to: user.email,
      subject: `[Test] ${digest.subject}`,
      html: digest.html,
      text: digest.text,
    });
  } catch (e) {
    const status = e instanceof EmailNotConfiguredError ? 503 : 502;
    return Response.json({ error: (e as Error).message }, { status });
  }
  return Response.json({ ok: true, to: user.email, count: digest.count });
}
