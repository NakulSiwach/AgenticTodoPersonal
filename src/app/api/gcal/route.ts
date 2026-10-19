import { getLink, signedInUser, toStatus } from "@/lib/gcalRoute";
import { googleConfigured } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

// Google Calendar connection status for the signed-in user. Never returns the token.
export async function GET() {
  const user = await signedInUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!googleConfigured()) return Response.json(toStatus(null));
  try {
    return Response.json(toStatus(await getLink(createAdminClient(), user.id)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
