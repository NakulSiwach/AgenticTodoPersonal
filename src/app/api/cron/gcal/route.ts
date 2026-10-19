import { authorizedCron } from "@/lib/cronAuth";
import { appBaseUrl } from "@/lib/email";
import { GoogleAuthRevokedError, googleConfigured, LINKS_TABLE, syncUser, type LinkRow } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Safety net, called every ~15 minutes by .github/workflows/daily-digest.yml: re-syncs every
// connected Google Calendar, catching changes the app couldn't push (offline edits, closed tabs).
// Cheap when nothing changed: one token refresh + one event list per user.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!authorizedCron(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // Not an error: Google sync is optional, and failing here would turn the shared workflow red.
  if (!googleConfigured()) return Response.json({ checked: 0, note: "Google Calendar sync not configured" });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }

  const { data, error } = await admin.from(LINKS_TABLE).select("*");
  if (error) {
    // Migration 0004 not applied yet: nothing to sync.
    if (/schema cache|does not exist/i.test(error.message)) return Response.json({ checked: 0, note: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }

  const result = { checked: 0, synced: 0, skipped: 0, failed: 0, writes: 0 };
  for (const link of (data ?? []) as LinkRow[]) {
    result.checked++;
    // Access was revoked: retrying every 15 minutes can't help until the user reconnects.
    if (link.last_error === new GoogleAuthRevokedError().message) {
      result.skipped++;
      continue;
    }
    try {
      const r = await syncUser(admin, link, appBaseUrl());
      result.synced++;
      result.writes += r.created + r.updated + r.deleted;
    } catch (e) {
      result.failed++;
      console.error("Google Calendar sync failed for a user:", (e as Error).message);
    }
  }
  return Response.json(result);
}
