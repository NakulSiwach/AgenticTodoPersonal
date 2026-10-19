// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventIdFor, type SyncTodo } from "@/lib/gcalEvents";
import {
  decryptToken,
  encryptToken,
  GoogleAuthRevokedError,
  MAX_WRITES_PER_RUN,
  syncUser,
  type LinkRow,
} from "@/lib/google";

const KEY = "test-token-key";

describe("token encryption", () => {
  it("round-trips and never stores the plain token", () => {
    const sealed = encryptToken("1//refresh-token", KEY);
    expect(sealed).not.toContain("refresh-token");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(decryptToken(sealed, KEY)).toBe("1//refresh-token");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptToken("same", KEY)).not.toBe(encryptToken("same", KEY));
  });

  it("rejects a wrong key or a tampered value", () => {
    const sealed = encryptToken("secret", KEY);
    expect(() => decryptToken(sealed, "other-key")).toThrow();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptToken(parts.join("."), KEY)).toThrow();
    expect(() => decryptToken("garbage", KEY)).toThrow(/Reconnect/);
  });
});

// ---- A tiny in-memory Google Calendar ----

type Stored = { body: Record<string, unknown>; cancelled: boolean };

function fakeGoogle() {
  const calendars = new Map<string, Map<string, Stored>>([["cal-1", new Map()]]);
  const calls: string[] = [];
  let revoked = false;
  let nextCal = 2;

  const json = (status: number, body: unknown = {}) =>
    new Response(status === 204 ? null : JSON.stringify(body), { status });

  const handler = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);
    if (url.href.startsWith("https://oauth2.googleapis.com/token")) {
      return revoked ? json(400, { error: "invalid_grant" }) : json(200, { access_token: "at" });
    }
    const m = url.pathname.match(/^\/calendar\/v3\/calendars(?:\/([^/]+))?(?:\/events(?:\/([^/]+))?)?$/);
    if (!m) return json(404);
    const calId = m[1] && decodeURIComponent(m[1]);
    const eventId = m[2];
    if (!calId && method === "POST") {
      const id = `cal-${nextCal++}`;
      calendars.set(id, new Map());
      return json(200, { id });
    }
    const cal = calendars.get(calId!);
    if (!cal) return json(404, { error: { message: "Not Found" } });
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    if (!url.pathname.includes("/events")) return json(404);
    if (method === "GET") {
      const [k, v] = (url.searchParams.get("privateExtendedProperty") ?? "=").split("=");
      const items = [...cal.entries()]
        .filter(([, e]) => !e.cancelled)
        .filter(([, e]) => (e.body.extendedProperties as { private?: Record<string, string> })?.private?.[k] === v)
        .map(([id, e]) => ({ id, extendedProperties: e.body.extendedProperties }));
      return json(200, { items });
    }
    if (method === "POST") {
      const id = body.id as string;
      if (cal.has(id)) return json(409, { error: { message: "The requested identifier already exists." } });
      cal.set(id, { body, cancelled: false });
      return json(200, body);
    }
    if (method === "PUT") {
      if (!cal.has(eventId!)) return json(404);
      cal.set(eventId!, { body, cancelled: body.status === "cancelled" });
      return json(200, body);
    }
    if (method === "DELETE") {
      const e = cal.get(eventId!);
      if (!e || e.cancelled) return json(410);
      e.cancelled = true; // Google keeps deleted ids around: re-inserting the same id gives 409
      return json(204);
    }
    return json(405);
  };

  return {
    calendars,
    calls,
    revoke: () => (revoked = true),
    live: (calId = "cal-1") => [...(calendars.get(calId)?.entries() ?? [])].filter(([, e]) => !e.cancelled),
    handler,
  };
}

// Minimal stand-in for the service-role Supabase client: just the calls syncUser makes.
function fakeAdmin(todos: SyncTodo[]) {
  const updates: Record<string, unknown>[] = [];
  const admin = {
    from(table: string) {
      const q = {
        update(patch: Record<string, unknown>) {
          updates.push(patch);
          return q;
        },
        select: () => q,
        eq: () => q,
        not: () => q,
        maybeSingle: async () => ({ data: { timezone: "Asia/Calcutta" }, error: null }),
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          const rows = table === "todos" ? todos.filter((t) => t.due_date) : null;
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return { admin: admin as never, updates };
}

function todo(n: number, over: Partial<SyncTodo> = {}): SyncTodo {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    title: `Task ${n}`,
    notes: null,
    priority: 2,
    completed: false,
    due_date: "2026-10-25",
    list_name: null,
    tags: [],
    subtasks: [],
    repeat: null,
    ...over,
  };
}

let google: ReturnType<typeof fakeGoogle>;
let link: LinkRow;

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "cid");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "csecret");
  vi.stubEnv("GOOGLE_TOKEN_KEY", KEY);
  google = fakeGoogle();
  vi.stubGlobal("fetch", vi.fn(google.handler));
  link = {
    user_id: "u1",
    google_email: "me@gmail.com",
    calendar_id: "cal-1",
    refresh_token_enc: encryptToken("rt", KEY),
    last_synced_at: null,
    last_error: null,
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("syncUser", () => {
  it("creates events for dated tasks, then does nothing on a repeat run", async () => {
    const { admin, updates } = fakeAdmin([todo(1), todo(2), todo(3, { due_date: null })]);
    expect(await syncUser(admin, link, "https://app")).toEqual({
      created: 2,
      updated: 0,
      deleted: 0,
      failed: 0,
      remaining: 0,
    });
    expect(google.live().map(([id]) => id).sort()).toEqual([eventIdFor(todo(1).id), eventIdFor(todo(2).id)].sort());
    expect(updates.at(-1)).toMatchObject({ last_error: null, last_synced_at: expect.any(String) });

    google.calls.length = 0;
    expect(await syncUser(admin, link, "https://app")).toMatchObject({ created: 0, updated: 0, deleted: 0 });
    expect(google.calls.filter((c) => !c.startsWith("GET") && !c.includes("/token"))).toEqual([]);
  });

  it("updates changed tasks and removes deleted ones", async () => {
    await syncUser(fakeAdmin([todo(1), todo(2)]).admin, link, "https://app");
    const r = await syncUser(fakeAdmin([todo(1, { title: "Renamed" })]).admin, link, "https://app");
    expect(r).toMatchObject({ created: 0, updated: 1, deleted: 1 });
    const live = google.live();
    expect(live).toHaveLength(1);
    expect(live[0][1].body.summary).toBe("Renamed");
  });

  it("restores an event whose id was deleted before (409 on insert)", async () => {
    await syncUser(fakeAdmin([todo(1)]).admin, link, "https://app");
    await syncUser(fakeAdmin([]).admin, link, "https://app"); // task deleted → event cancelled
    expect(google.live()).toHaveLength(0);
    const r = await syncUser(fakeAdmin([todo(1)]).admin, link, "https://app"); // e.g. undo / re-dated
    expect(r).toMatchObject({ updated: 1, failed: 0 });
    expect(google.live()).toHaveLength(1);
  });

  it("never touches events the user added to the calendar by hand", async () => {
    google.calendars.get("cal-1")!.set("manual1", { body: { summary: "Dentist" }, cancelled: false });
    await syncUser(fakeAdmin([todo(1)]).admin, link, "https://app");
    expect(google.live().map(([id]) => id)).toContain("manual1");
  });

  it("makes a new calendar when the user deleted the TaskFlow one", async () => {
    google.calendars.delete("cal-1");
    const { admin, updates } = fakeAdmin([todo(1)]);
    const r = await syncUser(admin, link, "https://app");
    expect(r.created).toBe(1);
    expect(updates).toContainEqual({ calendar_id: "cal-2" });
    expect(google.live("cal-2")).toHaveLength(1);
  });

  it("caps writes per run and reports what's left", async () => {
    const many = Array.from({ length: MAX_WRITES_PER_RUN + 7 }, (_, i) => todo(i + 1));
    const first = await syncUser(fakeAdmin(many).admin, link, "https://app");
    expect(first).toMatchObject({ created: MAX_WRITES_PER_RUN, remaining: 7 });
    const second = await syncUser(fakeAdmin(many).admin, link, "https://app");
    expect(second).toMatchObject({ created: 7, remaining: 0 });
  });

  it("records a reconnect message when Google access was revoked", async () => {
    google.revoke();
    const { admin, updates } = fakeAdmin([todo(1)]);
    await expect(syncUser(admin, link, "https://app")).rejects.toBeInstanceOf(GoogleAuthRevokedError);
    expect(updates.at(-1)).toEqual({ last_error: new GoogleAuthRevokedError().message });
  });
});
