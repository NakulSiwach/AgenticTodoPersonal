import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/lib/quickadd";

const NOW = "2026-10-17"; // Saturday

describe("parseQuickAdd", () => {
  it("leaves plain text alone", () => {
    expect(parseQuickAdd("Buy milk", NOW)).toEqual({ title: "Buy milk", tags: [] });
  });
  it("extracts date, priority, list and tags", () => {
    expect(parseQuickAdd("Call mom tomorrow !1 #Family @phone @urgent", NOW)).toEqual({
      title: "Call mom",
      due_date: "2026-10-18",
      priority: 1,
      list_name: "Family",
      tags: ["phone", "urgent"],
    });
  });
  it("understands weekdays, relative days and next week", () => {
    expect(parseQuickAdd("Report friday", NOW).due_date).toBe("2026-10-23");
    expect(parseQuickAdd("Dentist in 3 days", NOW).due_date).toBe("2026-10-20");
    expect(parseQuickAdd("Plan next week", NOW).due_date).toBe("2026-10-19");
  });
  it("understands repeats", () => {
    expect(parseQuickAdd("Water plants every day", NOW)).toMatchObject({
      title: "Water plants",
      repeat: "daily",
    });
    expect(parseQuickAdd("Standup every monday", NOW)).toMatchObject({
      title: "Standup",
      repeat: "weekly",
      due_date: "2026-10-19",
    });
  });
  it("accepts p-style priorities", () => {
    expect(parseQuickAdd("Fix bug p0", NOW)).toMatchObject({ title: "Fix bug", priority: 0 });
  });
  it("keeps the text as the title when only tokens were typed", () => {
    expect(parseQuickAdd("tomorrow", NOW)).toEqual({ title: "tomorrow", tags: [] });
  });
  it("does not split words that merely contain a token", () => {
    expect(parseQuickAdd("Read monday-night notes", NOW).due_date).toBeUndefined();
    expect(parseQuickAdd("Email a@b.com", NOW).tags).toEqual([]);
  });
});
