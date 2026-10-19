import { describe, expect, it } from "vitest";
import { buildDigest, type DigestTodo } from "@/lib/digest";

const TODAY = "2026-10-17"; // Saturday
const quote = { text: "Well begun is half done.", author: "Aristotle", source: "Politics" };

function t(title: string, over: Partial<DigestTodo> = {}): DigestTodo {
  return { title, priority: 2, due_date: TODAY, list_name: null, tags: [], subtasks: [], notes: null, ...over };
}

describe("buildDigest with reminders and a quote", () => {
  it("lists reminders above the tasks and counts both in the subject", () => {
    const d = buildDigest({
      name: "",
      today: TODAY,
      appUrl: "https://app.example.com",
      todos: [t("Pay rent", { due_date: "2026-10-15" })],
      reminders: ["Take medicines", "Water the plants"],
    });
    expect(d.reminderCount).toBe(2);
    expect(d.subject).toBe("1 task + 2 reminders for today (1 overdue) · Sat, 17 Oct 2026");
    expect(d.html).toContain("Reminders for today");
    expect(d.html.indexOf("Take medicines")).toBeLessThan(d.html.indexOf("Pay rent"));
    expect(d.text).toContain("Reminders for today (2)");
    expect(d.text).toContain("  • Water the plants");
    expect(d.text.indexOf("Take medicines")).toBeLessThan(d.text.indexOf("Pay rent"));
  });

  it("works with reminders only", () => {
    const d = buildDigest({ name: "", today: TODAY, appUrl: "x", todos: [], reminders: ["Gym"] });
    expect(d.subject).toBe("1 reminder for today · Sat, 17 Oct 2026");
    expect(d.text).toContain("No tasks due today.");
    expect(d.html).toContain("No tasks due today.");
  });

  it("puts the quote at the bottom, after the tasks", () => {
    const d = buildDigest({ name: "", today: TODAY, appUrl: "https://a.b", todos: [t("Gym")], quote });
    expect(d.html).toContain("Thought for the day");
    expect(d.html).toContain("&ldquo;Well begun is half done.&rdquo;");
    expect(d.html).toContain("Aristotle");
    expect(d.html.indexOf("Gym")).toBeLessThan(d.html.indexOf("Well begun"));
    expect(d.html.indexOf("Well begun")).toBeLessThan(d.html.indexOf("Open TaskFlow"));
    expect(d.text).toContain('"Well begun is half done."');
    expect(d.text).toContain("— Aristotle, Politics");
  });

  it("omits both sections when not given", () => {
    const d = buildDigest({ name: "", today: TODAY, appUrl: "x", todos: [t("Gym")] });
    expect(d.reminderCount).toBe(0);
    expect(d.html).not.toContain("Reminders for today");
    expect(d.html).not.toContain("Thought for the day");
  });

  it("escapes reminder and quote text", () => {
    const d = buildDigest({
      name: "",
      today: TODAY,
      appUrl: "x",
      todos: [],
      reminders: ['<img src=x onerror="alert(1)">'],
      quote: { text: "<b>bold</b>", author: "A & B" },
    });
    expect(d.html).not.toContain("<img src=x");
    expect(d.html).not.toContain("<b>bold</b>");
    expect(d.html).toContain("&lt;img src=x");
    expect(d.html).toContain("A &amp; B");
  });
});
