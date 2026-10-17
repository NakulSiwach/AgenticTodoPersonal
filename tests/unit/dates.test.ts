import { describe, expect, it } from "vitest";
import { addDays, diffDays, formatDue, nextOccurrence, nextWeekday } from "@/lib/dates";

// 2026-10-17 is a Saturday.
const NOW = "2026-10-17";

describe("dates", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("diffs whole days", () => {
    expect(diffDays("2026-10-20", NOW)).toBe(3);
    expect(diffDays("2026-10-10", NOW)).toBe(-7);
  });
  it("finds the next weekday strictly after the given day", () => {
    expect(nextWeekday(NOW, 6)).toBe("2026-10-24"); // Saturday -> a week later
    expect(nextWeekday(NOW, 1)).toBe("2026-10-19"); // Monday
  });
  it("labels due dates relative to today", () => {
    expect(formatDue(NOW, NOW)).toEqual({ label: "Today", tone: "today" });
    expect(formatDue("2026-10-18", NOW)).toEqual({ label: "Tomorrow", tone: "soon" });
    expect(formatDue("2026-10-16", NOW)).toEqual({ label: "Yesterday", tone: "overdue" });
    expect(formatDue("2026-10-01", NOW).tone).toBe("overdue");
    expect(formatDue("2026-12-25", NOW).tone).toBe("later");
  });
  it("advances repeating tasks to a date after today", () => {
    expect(nextOccurrence("2026-10-17", "daily", NOW)).toBe("2026-10-18");
    expect(nextOccurrence("2026-10-01", "daily", NOW)).toBe("2026-10-18");
    expect(nextOccurrence("2026-10-17", "weekly", NOW)).toBe("2026-10-24");
    expect(nextOccurrence("2026-10-17", "weekdays", NOW)).toBe("2026-10-19");
    expect(nextOccurrence("2026-01-31", "monthly", "2026-01-31")).toBe("2026-02-28");
    expect(nextOccurrence("2026-10-17", "yearly", NOW)).toBe("2027-10-17");
  });
});
