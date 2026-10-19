// Server-only helpers shared by the /api/gcal routes. Each route authenticates the signed-in user
// from their cookies FIRST, and only then uses the service-role client, scoped to that user's id.
import { googleConfigured, LINKS_TABLE, type LinkRow } from "./google";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { GcalStatus } from "./types";

export async function signedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getLink(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<LinkRow | null> {
  const { data, error } = await admin.from(LINKS_TABLE).select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    if (/schema cache|does not exist/i.test(error.message)) {
      throw new Error("Database needs the latest update: run supabase/migrations/0004_google_calendar.sql");
    }
    throw new Error(error.message);
  }
  return data as LinkRow | null;
}

export function toStatus(link: LinkRow | null): GcalStatus {
  return {
    configured: googleConfigured(),
    connected: Boolean(link),
    email: link?.google_email ?? null,
    lastSyncedAt: link?.last_synced_at ?? null,
    lastError: link?.last_error ?? null,
  };
}

/** Accepts an IANA zone name the runtime knows; anything else becomes UTC. */
export function validTimezone(tz: string | null | undefined): string {
  if (!tz || tz.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export const STATE_COOKIE = "gcal_oauth";

export function callbackUrl(origin: string): string {
  return `${origin}/api/gcal/callback`;
}
