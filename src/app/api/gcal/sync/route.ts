import { appBaseUrl } from "@/lib/email";
import { getLink, signedInUser, toStatus } from "@/lib/gcalRoute";
import { GoogleAuthRevokedError, GoogleNotConfiguredError, syncUser } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Push the signed-in user's tasks to their TaskFlow calendar. Called by the app a few seconds
// after task changes and by the "Sync now" button. Responds with counts plus the fresh status.
export async function POST() {
  const user = await signedInUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const link = await getLink(admin, user.id);
    if (!link) return Response.json({ error: "Google Calendar isn't connected", status: toStatus(null) }, { status: 409 });
    try {
      const result = await syncUser(admin, link, appBaseUrl());
      return Response.json({ ...result, status: toStatus(await getLink(admin, user.id)) });
    } catch (e) {
      const status = e instanceof GoogleAuthRevokedError ? 409 : e instanceof GoogleNotConfiguredError ? 503 : 502;
      return Response.json(
        { error: (e as Error).message, status: toStatus(await getLink(admin, user.id).catch(() => link)) },
        { status },
      );
    }
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
