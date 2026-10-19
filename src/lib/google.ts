// Server-only: Google OAuth + Calendar API over plain fetch (no SDK), token encryption, and the
// per-user sync. Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_TOKEN_KEY.
// Never import this from client code.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { planSync, SYNC_COLUMNS, type CalendarEvent, type ExistingEvent, type SyncTodo } from "./gcalEvents";
import type { createAdminClient } from "./supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Only calendars this app creates: TaskFlow can't see or touch the user's other calendars. */
export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const SCOPES = ["openid", "email", GCAL_SCOPE].join(" ");
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
export const LINKS_TABLE = "google_calendar_links";
export const CALENDAR_NAME = "TaskFlow";

/** Writes per user per sync run; anything beyond waits for the next run. Keeps runs short. */
export const MAX_WRITES_PER_RUN = 120;
const CONCURRENCY = 5;

export class GoogleNotConfiguredError extends Error {
  constructor() {
    super("Google Calendar sync is not set up on the server yet (missing GOOGLE_* settings).");
  }
}

/** The user removed TaskFlow's access in their Google account, or the grant expired. */
export class GoogleAuthRevokedError extends Error {
  constructor() {
    super("Google access was removed or expired. Reconnect Google Calendar.");
  }
}

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_TOKEN_KEY,
  );
}

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const tokenKey = process.env.GOOGLE_TOKEN_KEY;
  if (!clientId || !clientSecret || !tokenKey) throw new GoogleNotConfiguredError();
  return { clientId, clientSecret, tokenKey };
}

// ---- Refresh-token encryption (AES-256-GCM). Format: v1.<iv>.<tag>.<ciphertext>, base64url. ----

function keyFrom(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string, secret: string = config().tokenKey): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptToken(sealed: string, secret: string = config().tokenKey): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Stored Google token is unreadable. Reconnect.");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

// ---- OAuth ----

export function authUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: config().clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline", // we need a refresh token for background syncs
    prompt: "consent", // always return a refresh token, even on reconnect
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok) {
    if (body.error === "invalid_grant") throw new GoogleAuthRevokedError();
    throw new GoogleApiError(`Google sign-in failed: ${body.error_description ?? body.error ?? res.status}`, res.status);
  }
  return body;
}

// The id_token comes straight from Google's token endpoint over TLS, so reading its payload
// without verifying the signature is safe here (it's only used to show which account is linked).
function emailFromIdToken(idToken: string | undefined): string | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken!.split(".")[1], "base64url").toString("utf8")) as {
      email?: string;
    };
    return payload.email ?? null;
  } catch {
    return null;
  }
}

export async function exchangeCode(code: string, redirectUri: string) {
  const body = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (!body.scope?.split(" ").includes(GCAL_SCOPE)) {
    throw new Error("Calendar access wasn't granted. Connect again and allow TaskFlow to manage its calendar.");
  }
  if (!body.access_token || !body.refresh_token) throw new Error("Google didn't return a refresh token. Try again.");
  return { accessToken: body.access_token, refreshToken: body.refresh_token, email: emailFromIdToken(body.id_token) };
}

export async function accessTokenFrom(refreshToken: string): Promise<string> {
  const body = await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
  if (!body.access_token) throw new GoogleApiError("Google didn't return an access token.", 502);
  return body.access_token;
}

/** Best effort: tells Google to drop TaskFlow's access. */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}

// ---- Calendar API ----

async function api<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) {
    throw new GoogleApiError(`Google Calendar error (${res.status}): ${json.error?.message ?? res.statusText}`, res.status);
  }
  return json as T;
}

const eventsPath = (calendarId: string) => `/calendars/${encodeURIComponent(calendarId)}/events`;

export async function createCalendar(token: string, timeZone: string): Promise<string> {
  const cal = await api<{ id: string }>(token, "POST", "/calendars", {
    summary: CALENDAR_NAME,
    description: "Tasks with a due date, kept in sync by TaskFlow. Edit tasks in TaskFlow; changes here are overwritten.",
    timeZone,
  });
  return cal.id;
}

export async function deleteCalendar(token: string, calendarId: string): Promise<void> {
  try {
    await api(token, "DELETE", `/calendars/${encodeURIComponent(calendarId)}`);
  } catch (e) {
    if (!(e instanceof GoogleApiError && (e.status === 404 || e.status === 410))) throw e;
  }
}

async function listTaskflowEvents(token: string, calendarId: string): Promise<ExistingEvent[]> {
  const out: ExistingEvent[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      privateExtendedProperty: "taskflow=1", // never touch events the user added by hand
      showDeleted: "false",
      maxResults: "2500",
      fields: "items(id,extendedProperties),nextPageToken",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await api<{
      items?: { id: string; extendedProperties?: { private?: { tfhash?: string } } }[];
      nextPageToken?: string;
    }>(token, "GET", `${eventsPath(calendarId)}?${params}`);
    for (const e of page.items ?? []) out.push({ id: e.id, hash: e.extendedProperties?.private?.tfhash ?? null });
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

const gone = (e: unknown) => e instanceof GoogleApiError && (e.status === 404 || e.status === 410);

/** Returns "created" or "updated". Safe to repeat and to race with another sync. */
async function upsertEvent(token: string, calendarId: string, event: CalendarEvent, exists: boolean) {
  const path = eventsPath(calendarId);
  const put = () => api(token, "PUT", `${path}/${event.id}`, event);
  if (exists) {
    try {
      await put();
      return "updated" as const;
    } catch (e) {
      if (!gone(e)) throw e;
    }
  }
  try {
    await api(token, "POST", path, event);
    return "created" as const;
  } catch (e) {
    // 409: the id exists, e.g. a previously deleted event. PUT with status "confirmed" restores it.
    if (!(e instanceof GoogleApiError && e.status === 409)) throw e;
    await put();
    return "updated" as const;
  }
}

async function deleteEvent(token: string, calendarId: string, id: string) {
  try {
    await api(token, "DELETE", `${eventsPath(calendarId)}/${id}`);
  } catch (e) {
    if (!gone(e)) throw e;
  }
}

async function runLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ---- Sync ----

export type LinkRow = {
  user_id: string;
  google_email: string | null;
  calendar_id: string;
  refresh_token_enc: string;
  last_synced_at: string | null;
  last_error: string | null;
};

export type SyncResult = { created: number; updated: number; deleted: number; failed: number; remaining: number };

/**
 * Make the user's TaskFlow calendar match their tasks. Idempotent: event ids come from task ids and
 * unchanged events are skipped by fingerprint. The caller must have authenticated the user.
 */
export async function syncUser(admin: Admin, link: LinkRow, appUrl: string): Promise<SyncResult> {
  const record = (patch: Partial<LinkRow>) => admin.from(LINKS_TABLE).update(patch).eq("user_id", link.user_id);
  try {
    const token = await accessTokenFrom(decryptToken(link.refresh_token_enc));

    let calendarId = link.calendar_id;
    let existing: ExistingEvent[];
    try {
      existing = await listTaskflowEvents(token, calendarId);
    } catch (e) {
      if (!gone(e)) throw e;
      // The user deleted the TaskFlow calendar in Google: make a fresh one.
      const { data: profile } = await admin.from("profiles").select("timezone").eq("user_id", link.user_id).maybeSingle();
      calendarId = await createCalendar(token, profile?.timezone ?? "UTC");
      await record({ calendar_id: calendarId });
      existing = [];
    }

    const { data, error } = await admin
      .from("todos")
      .select(SYNC_COLUMNS)
      .eq("user_id", link.user_id)
      .not("due_date", "is", null);
    if (error) throw new Error(error.message);
    const todos = ((data ?? []) as unknown as SyncTodo[]).map((t) => ({
      ...t,
      tags: t.tags ?? [],
      subtasks: t.subtasks ?? [],
    }));

    const plan = planSync(todos, existing, appUrl);
    const jobs: (() => Promise<"created" | "updated" | "deleted">)[] = [
      ...plan.deletes.map((id) => async () => (await deleteEvent(token, calendarId, id), "deleted" as const)),
      ...plan.upserts.map((u) => () => upsertEvent(token, calendarId, u.event, u.exists)),
    ];
    const batch = jobs.slice(0, MAX_WRITES_PER_RUN);
    const result: SyncResult = { created: 0, updated: 0, deleted: 0, failed: 0, remaining: jobs.length - batch.length };
    const errors: string[] = [];
    await runLimited(batch, CONCURRENCY, async (job) => {
      try {
        result[await job()]++;
      } catch (e) {
        result.failed++;
        errors.push((e as Error).message);
      }
    });

    await record({ last_synced_at: new Date().toISOString(), last_error: errors[0]?.slice(0, 500) ?? null });
    return result;
  } catch (e) {
    await record({ last_error: (e as Error).message.slice(0, 500) });
    throw e;
  }
}
