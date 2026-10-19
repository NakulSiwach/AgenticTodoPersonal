import { NextResponse, type NextRequest } from "next/server";
import { appBaseUrl } from "@/lib/email";
import { callbackUrl, getLink, signedInUser, STATE_COOKIE, validTimezone } from "@/lib/gcalRoute";
import {
  createCalendar,
  encryptToken,
  exchangeCode,
  GoogleAuthRevokedError,
  LINKS_TABLE,
  syncUser,
  type LinkRow,
} from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Google redirects here after the consent screen. Stores the (encrypted) refresh token, creates
// the "TaskFlow" calendar on first connect, runs a first sync, then returns to the Profile page.
// Errors come back as short codes (not free text) so this URL can't be used to show arbitrary messages.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const back = (query: string) => {
    const res = NextResponse.redirect(new URL(`/profile?${query}`, origin));
    res.cookies.set(STATE_COOKIE, "", { path: "/api/gcal", maxAge: 0 });
    return res;
  };

  const user = await signedInUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  let saved: { state?: string; tz?: string } = {};
  try {
    saved = JSON.parse(Buffer.from(request.cookies.get(STATE_COOKIE)?.value ?? "", "base64url").toString("utf8"));
  } catch {
    /* missing or garbled cookie: treated as a state mismatch below */
  }
  if (params.get("error")) return back("gcal=error&reason=denied");
  const code = params.get("code");
  if (!code || !saved.state || saved.state !== params.get("state")) return back("gcal=error&reason=expired");

  try {
    const { accessToken, refreshToken, email } = await exchangeCode(code, callbackUrl(origin));
    const admin = createAdminClient();
    const previous = await getLink(admin, user.id);
    // Reconnecting keeps the existing calendar; if it's gone (or belongs to another Google
    // account) the first sync notices and creates a fresh one.
    const calendarId = previous?.calendar_id ?? (await createCalendar(accessToken, validTimezone(saved.tz)));
    const link: LinkRow = {
      user_id: user.id,
      google_email: email,
      calendar_id: calendarId,
      refresh_token_enc: encryptToken(refreshToken),
      last_synced_at: previous?.last_synced_at ?? null,
      last_error: null,
    };
    const { error } = await admin.from(LINKS_TABLE).upsert(link, { onConflict: "user_id" });
    if (error) throw new Error(error.message);

    try {
      await syncUser(admin, link, appBaseUrl());
    } catch (e) {
      // Connected anyway; the error is stored on the link and shown on the Profile page.
      console.error("first Google Calendar sync failed:", (e as Error).message);
    }
    return back("gcal=connected");
  } catch (e) {
    const message = (e as Error).message;
    console.error("Google Calendar connect failed:", message);
    if (e instanceof GoogleAuthRevokedError) return back("gcal=error&reason=expired");
    if (/wasn't granted/.test(message)) return back("gcal=error&reason=scope");
    if (/0004_google_calendar/.test(message)) return back("gcal=error&reason=migration");
    return back("gcal=error&reason=failed");
  }
}
