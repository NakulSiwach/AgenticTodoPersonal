import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { callbackUrl, signedInUser, STATE_COOKIE, validTimezone } from "@/lib/gcalRoute";
import { authUrl, googleConfigured } from "@/lib/google";

// "Connect Google Calendar" button: sends the signed-in user to Google's consent screen.
// A random `state` in an httpOnly cookie ties the callback to this browser (CSRF protection).
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!(await signedInUser())) return NextResponse.redirect(new URL("/login", origin));
  if (!googleConfigured()) return NextResponse.redirect(new URL("/profile?gcal=error&reason=not-configured", origin));

  const state = randomBytes(24).toString("base64url");
  const tz = validTimezone(request.nextUrl.searchParams.get("tz"));
  const response = NextResponse.redirect(authUrl({ redirectUri: callbackUrl(origin), state }));
  response.cookies.set(STATE_COOKIE, Buffer.from(JSON.stringify({ state, tz })).toString("base64url"), {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax", // sent on Google's top-level redirect back to us
    path: "/api/gcal",
    maxAge: 600,
  });
  return response;
}
