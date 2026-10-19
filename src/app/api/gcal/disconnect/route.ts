import { getLink, signedInUser, toStatus } from "@/lib/gcalRoute";
import { accessTokenFrom, decryptToken, deleteCalendar, LINKS_TABLE, revokeToken } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

// Stop syncing. Optionally deletes the TaskFlow calendar from Google, then revokes TaskFlow's
// access and forgets the token. Google-side steps are best effort: the link is always removed.
export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let removeCalendar = false;
  try {
    removeCalendar = ((await request.json()) as { removeCalendar?: unknown }).removeCalendar === true;
  } catch {
    /* no body: keep the calendar */
  }

  try {
    const admin = createAdminClient();
    const link = await getLink(admin, user.id);
    if (!link) return Response.json({ ok: true, calendarRemoved: false, status: toStatus(null) });

    let calendarRemoved = false;
    try {
      const refreshToken = decryptToken(link.refresh_token_enc);
      if (removeCalendar) {
        await deleteCalendar(await accessTokenFrom(refreshToken), link.calendar_id);
        calendarRemoved = true;
      }
      await revokeToken(refreshToken);
    } catch (e) {
      console.error("Google Calendar disconnect (Google side) failed:", (e as Error).message);
    }

    const { error } = await admin.from(LINKS_TABLE).delete().eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, calendarRemoved, status: toStatus(null) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
