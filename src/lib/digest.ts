import { diffDays, localClock, parseClockTime } from "./dates";
import { PRIORITY_HINTS } from "./palette";
import type { Priority, Todo } from "./types";

export type DigestTodo = Pick<
  Todo,
  "title" | "priority" | "due_date" | "list_name" | "tags" | "subtasks" | "notes"
>;

export type DigestInput = {
  /** Shown in the greeting. */
  name: string;
  todos: DigestTodo[];
  /** The recipient's local date, `YYYY-MM-DD`. */
  today: string;
  appUrl: string;
};

export type Digest = { subject: string; html: string; text: string; count: number; overdue: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Fixed English formatting so the email reads the same whatever locale the server runs in.
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${DAYS[new Date(y, m - 1, d).getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

const PRIORITY_COLOR: Record<Priority, { bg: string; fg: string }> = {
  0: { bg: "#dc2626", fg: "#ffffff" },
  1: { bg: "#f97316", fg: "#ffffff" },
  2: { bg: "#fbbf24", fg: "#1f2937" },
  3: { bg: "#3b82f6", fg: "#ffffff" },
  4: { bg: "#9ca3af", fg: "#1f2937" },
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Priority first (P0 on top), then oldest due date, then title. */
export function sortDigest<T extends DigestTodo>(todos: T[]): T[] {
  return [...todos].sort(
    (a, b) =>
      a.priority - b.priority ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      a.title.localeCompare(b.title),
  );
}

function dueLabel(due: string | null, today: string): { text: string; overdue: boolean } | null {
  if (!due) return null;
  const d = diffDays(due, today);
  if (d < 0) return { text: d === -1 ? "Overdue since yesterday" : `Overdue since ${shortDate(due)}`, overdue: true };
  return { text: "Due today", overdue: false };
}

function metaParts(t: DigestTodo, today: string): { text: string; overdue: boolean }[] {
  const out: { text: string; overdue: boolean }[] = [];
  const due = dueLabel(t.due_date, today);
  if (due) out.push(due);
  if (t.list_name) out.push({ text: `#${t.list_name}`, overdue: false });
  for (const tag of t.tags) out.push({ text: `@${tag}`, overdue: false });
  if (t.subtasks.length > 0) {
    const done = t.subtasks.filter((s) => s.done).length;
    out.push({ text: `${done}/${t.subtasks.length} subtasks`, overdue: false });
  }
  return out;
}

export function buildDigest({ name, todos, today, appUrl }: DigestInput): Digest {
  const sorted = sortDigest(todos);
  const overdue = sorted.filter((t) => t.due_date !== null && diffDays(t.due_date, today) < 0).length;
  const count = sorted.length;
  const base = appUrl.replace(/\/$/, "");
  const greeting = `Good morning${name ? `, ${name}` : ""}`;

  const subject =
    count === 0
      ? `Nothing due today · ${longDate(today)}`
      : `${count} ${count === 1 ? "task" : "tasks"} for today${overdue ? ` (${overdue} overdue)` : ""} · ${longDate(today)}`;

  const groups = ([0, 1, 2, 3, 4] as Priority[])
    .map((p) => ({ p, items: sorted.filter((t) => t.priority === p) }))
    .filter((g) => g.items.length > 0);

  // ---- plain text ----
  const lines: string[] = [`${greeting}!`, ""];
  if (count === 0) {
    lines.push("You have nothing due today. Enjoy the free time.");
  } else {
    lines.push(
      `You have ${count} pending ${count === 1 ? "task" : "tasks"} for today${overdue ? `, ${overdue} overdue` : ""}.`,
      "",
    );
    for (const g of groups) {
      lines.push(`P${g.p} · ${PRIORITY_HINTS[g.p]} (${g.items.length})`);
      for (const t of g.items) {
        const meta = metaParts(t, today).map((m) => m.text).join(" · ");
        lines.push(`  [ ] ${t.title}${meta ? `  (${meta})` : ""}`);
      }
      lines.push("");
    }
  }
  lines.push(`Open TaskFlow: ${base}`, "", `Change the time or turn this email off: ${base}/profile`);
  const text = lines.join("\n");

  // ---- html (table layout + inline styles for email clients) ----
  const groupHtml = groups
    .map((g) => {
      const c = PRIORITY_COLOR[g.p];
      const rows = g.items
        .map((t) => {
          const meta = metaParts(t, today)
            .map(
              (m) =>
                `<span style="color:${m.overdue ? "#dc2626" : "#6b7280"};${m.overdue ? "font-weight:600;" : ""}">${escapeHtml(m.text)}</span>`,
            )
            .join('<span style="color:#d1d5db;"> &middot; </span>');
          return `<tr>
  <td style="padding:10px 0 10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;width:26px;">
    <div style="width:16px;height:16px;border:2px solid ${c.bg};border-radius:50%;margin-top:2px;"></div>
  </td>
  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
    <div style="font-size:15px;line-height:21px;color:#111827;font-weight:500;">${escapeHtml(t.title)}</div>
    ${meta ? `<div style="font-size:12px;line-height:18px;margin-top:2px;">${meta}</div>` : ""}
  </td>
</tr>`;
        })
        .join("\n");
      return `<tr><td style="padding:18px 24px 0 24px;">
  <div style="margin-bottom:4px;">
    <span style="display:inline-block;background:${c.bg};color:${c.fg};font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">P${g.p}</span>
    <span style="font-size:13px;color:#374151;font-weight:600;margin-left:6px;">${PRIORITY_HINTS[g.p]}</span>
    <span style="font-size:12px;color:#9ca3af;margin-left:4px;">${g.items.length}</span>
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
</td></tr>`;
    })
    .join("\n");

  const summary =
    count === 0
      ? "You have nothing due today. Enjoy the free time."
      : `You have <strong>${count}</strong> pending ${count === 1 ? "task" : "tasks"} for today${
          overdue ? `, <strong style="color:#dc2626;">${overdue} overdue</strong>` : ""
        }. Highest priority first.`;

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f3f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td style="background:#4f46e5;padding:22px 24px;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;">TaskFlow</div>
    <div style="font-size:13px;color:#c7d2fe;margin-top:2px;">${escapeHtml(longDate(today))}</div>
  </td></tr>
  <tr><td style="padding:24px 24px 0 24px;">
    <div style="font-size:18px;font-weight:600;color:#111827;">${escapeHtml(greeting)}!</div>
    <div style="font-size:14px;line-height:21px;color:#4b5563;margin-top:6px;">${summary}</div>
  </td></tr>
  ${groupHtml}
  <tr><td align="center" style="padding:28px 24px 8px 24px;">
    <a href="${escapeHtml(base)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">Open TaskFlow</a>
  </td></tr>
  <tr><td style="padding:20px 24px 24px 24px;border-top:1px solid #f3f4f6;margin-top:16px;">
    <div style="font-size:12px;line-height:18px;color:#9ca3af;text-align:center;">
      You get this email because the daily digest is turned on.<br>
      <a href="${escapeHtml(base)}/profile" style="color:#6366f1;">Change the time or turn it off</a>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text, count, overdue };
}

/** How long after the chosen time a late scheduler run may still send that day's email. */
export const SEND_WINDOW_MINUTES = 180;

export type DigestSettings = {
  enabled: boolean;
  /** Local `HH:MM`. */
  time: string;
  timezone: string;
  lastDigestDate: string | null;
};

/** Should this user's digest go out right now? At most once per local day, near their chosen time. */
export function shouldSendDigest(s: DigestSettings, now: Date): { send: boolean; today: string } {
  const clock = localClock(now, s.timezone);
  const since = clock.minutes - parseClockTime(s.time);
  const send =
    s.enabled &&
    s.lastDigestDate !== clock.date &&
    Number.isFinite(since) &&
    since >= 0 &&
    since < SEND_WINDOW_MINUTES;
  return { send, today: clock.date };
}
