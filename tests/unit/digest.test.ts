import { describe, expect, it } from "vitest";
import { buildDigest, escapeHtml, shouldSendDigest, sortDigest, type DigestTodo } from "@/lib/digest";
import { localClock, parseClockTime } from "@/lib/dates";

const TODAY = "2026-10-17"; // Saturday

function t(title: string, priority: DigestTodo["priority"], over: Partial<DigestTodo> = {}): DigestTodo {
  return { title, priority, due_date: TODAY, list_name: null, tags: [], subtasks: [], notes: null, ...over };
}

describe("sortDigest", () => {
  it("orders by priority, then oldest due date, then title", () => {
    const sorted = sortDigest([
      t("b", 2),
      t("a", 2),
      t("late", 2, { due_date: "2026-10-10" }),
      t("urgent", 0),
      t("low", 4),
    ]);
    expect(sorted.map((x) => x.title)).toEqual(["urgent", "late", "a", "b", "low"]);
  });
});

describe("buildDigest", () => {
  it("lists tasks grouped by priority with an overdue count in the subject", () => {
    const d = buildDigest({
      name: "Asha",
      today: TODAY,
      appUrl: "https://app.example.com/",
      todos: [t("Pay rent", 0, { due_date: "2026-10-15", list_name: "Home" }), t("Gym", 3, { tags: ["health"] })],
    });
    expect(d.count).toBe(2);
    expect(d.overdue).toBe(1);
    expect(d.subject).toBe("2 tasks for today (1 overdue) · Sat, 17 Oct 2026");
    expect(d.text).toContain("Good morning, Asha!");
    expect(d.text.indexOf("P0")).toBeLessThan(d.text.indexOf("P3"));
    expect(d.text).toContain("Overdue since Oct 15");
    expect(d.html).toContain("https://app.example.com");
    expect(d.html).toContain("https://app.example.com/profile");
    expect(d.html.indexOf("Pay rent")).toBeLessThan(d.html.indexOf("Gym"));
  });

  it("escapes task text so it cannot inject markup", () => {
    const d = buildDigest({
      name: "<b>x</b>",
      today: TODAY,
      appUrl: "https://app.example.com",
      todos: [t('<script>alert("hi")</script>', 1)],
    });
    expect(d.html).not.toContain("<script>");
    expect(d.html).toContain("&lt;script&gt;");
    expect(d.html).not.toContain("<b>x</b>");
    expect(escapeHtml(`a&b"c'`)).toBe("a&amp;b&quot;c&#39;");
  });

  it("handles a day with nothing due", () => {
    const d = buildDigest({ name: "", today: TODAY, appUrl: "http://localhost:3000", todos: [] });
    expect(d.count).toBe(0);
    expect(d.subject).toContain("Nothing due today");
    expect(d.text).toContain("Good morning!");
  });
});

describe("local clock", () => {
  it("converts to the user's timezone", () => {
    const utc = new Date("2026-10-17T20:00:00Z");
    expect(localClock(utc, "Asia/Kolkata")).toEqual({ date: "2026-10-18", minutes: 1 * 60 + 30 });
    expect(localClock(utc, "America/New_York")).toEqual({ date: "2026-10-17", minutes: 16 * 60 });
  });
  it("falls back to UTC for an unknown timezone", () => {
    expect(localClock(new Date("2026-10-17T05:30:00Z"), "Not/AZone")).toEqual({
      date: "2026-10-17",
      minutes: 5 * 60 + 30,
    });
  });
  it("parses HH:MM and HH:MM:SS", () => {
    expect(parseClockTime("08:00")).toBe(480);
    expect(parseClockTime("08:15:00")).toBe(495);
    expect(parseClockTime("nope")).toBeNaN();
  });
});

describe("shouldSendDigest", () => {
  const base = { enabled: true, time: "08:00", timezone: "Asia/Kolkata", lastDigestDate: null };
  // 08:10 in Kolkata on 2026-10-17 = 02:40 UTC.
  const at = (iso: string) => new Date(iso);

  it("sends shortly after the chosen local time", () => {
    expect(shouldSendDigest(base, at("2026-10-17T02:40:00Z"))).toEqual({ send: true, today: "2026-10-17" });
  });
  it("does not send before the chosen time", () => {
    expect(shouldSendDigest(base, at("2026-10-17T02:00:00Z")).send).toBe(false); // 07:30 local
  });
  it("still sends a late run inside the window, but not long after", () => {
    expect(shouldSendDigest(base, at("2026-10-17T04:55:00Z")).send).toBe(true); // 10:25 local
    expect(shouldSendDigest(base, at("2026-10-17T06:00:00Z")).send).toBe(false); // 11:30 local
  });
  it("sends at most once per local day and respects the toggle", () => {
    expect(shouldSendDigest({ ...base, lastDigestDate: "2026-10-17" }, at("2026-10-17T02:40:00Z")).send).toBe(false);
    expect(shouldSendDigest({ ...base, lastDigestDate: "2026-10-16" }, at("2026-10-17T02:40:00Z")).send).toBe(true);
    expect(shouldSendDigest({ ...base, enabled: false }, at("2026-10-17T02:40:00Z")).send).toBe(false);
  });
});
