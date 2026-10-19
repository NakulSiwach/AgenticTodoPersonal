import { describe, expect, it } from "vitest";
import {
  cleanReminder,
  describeSchedule,
  dueOn,
  isDueOn,
  nextDueDate,
  reminderSchema,
  sortReminders,
  type Reminder,
  type ReminderInput,
} from "@/lib/reminders";

const id = "3b241101-e2bb-4255-8caf-4136c566a962";

function rem(over: Partial<Reminder> = {}): Reminder {
  return {
    id: over.id ?? id,
    user_id: "u",
    text: "Take medicines",
    schedule: "daily",
    days_of_week: [],
    on_date: null,
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

// Known weekdays: 2026-10-17 Sat, 2026-10-19 Mon, 2026-10-20 Tue.
describe("isDueOn", () => {
  it("daily is due every day, unless paused", () => {
    expect(isDueOn(rem(), "2026-10-17")).toBe(true);
    expect(isDueOn(rem({ active: false }), "2026-10-17")).toBe(false);
  });

  it("weekdays skips Saturday and Sunday", () => {
    const r = rem({ schedule: "weekdays" });
    expect(isDueOn(r, "2026-10-17")).toBe(false);
    expect(isDueOn(r, "2026-10-18")).toBe(false);
    expect(isDueOn(r, "2026-10-19")).toBe(true);
  });

  it("weekly fires on the chosen days only", () => {
    const gym = rem({ schedule: "weekly", days_of_week: [1, 3, 5] });
    expect(isDueOn(gym, "2026-10-19")).toBe(true); // Mon
    expect(isDueOn(gym, "2026-10-20")).toBe(false); // Tue
    expect(isDueOn(gym, "2026-10-21")).toBe(true); // Wed
  });

  it("monthly uses the day of the month and clamps the 31st to short months", () => {
    const rent = rem({ schedule: "monthly", on_date: "2026-01-31" });
    expect(isDueOn(rent, "2026-03-31")).toBe(true);
    expect(isDueOn(rent, "2026-04-30")).toBe(true);
    expect(isDueOn(rent, "2026-04-29")).toBe(false);
    expect(isDueOn(rent, "2026-02-28")).toBe(true);
  });

  it("yearly matches month and day, with 29 Feb falling on 28 Feb", () => {
    const bday = rem({ schedule: "yearly", on_date: "2024-02-29" });
    expect(isDueOn(bday, "2028-02-29")).toBe(true);
    expect(isDueOn(bday, "2027-02-28")).toBe(true);
    expect(isDueOn(bday, "2027-03-01")).toBe(false);
  });

  it("once is due only on its date", () => {
    const r = rem({ schedule: "once", on_date: "2026-10-25" });
    expect(isDueOn(r, "2026-10-25")).toBe(true);
    expect(isDueOn(r, "2026-10-26")).toBe(false);
  });

  it("dueOn filters a list", () => {
    const list = [rem({ id: "a" }), rem({ id: "b", schedule: "once", on_date: "2030-01-01" })];
    expect(dueOn(list, "2026-10-20").map((r) => r.id)).toEqual(["a"]);
  });
});

describe("nextDueDate", () => {
  it("returns today when due today, otherwise the next matching day", () => {
    expect(nextDueDate(rem(), "2026-10-20")).toBe("2026-10-20");
    expect(nextDueDate(rem({ schedule: "weekly", days_of_week: [6] }), "2026-10-20")).toBe("2026-10-24");
  });
  it("is null for a past one-off or a paused reminder", () => {
    expect(nextDueDate(rem({ schedule: "once", on_date: "2026-10-01" }), "2026-10-20")).toBeNull();
    expect(nextDueDate(rem({ active: false }), "2026-10-20")).toBeNull();
  });
});

describe("describeSchedule", () => {
  it("reads naturally", () => {
    expect(describeSchedule(rem())).toBe("Every day");
    expect(describeSchedule(rem({ schedule: "weekdays" }))).toBe("Weekdays");
    expect(describeSchedule(rem({ schedule: "weekly", days_of_week: [5, 1, 3] }))).toBe("Every Mon, Wed, Fri");
    expect(describeSchedule(rem({ schedule: "weekly", days_of_week: [0, 6] }))).toBe("Weekends");
    expect(describeSchedule(rem({ schedule: "monthly", on_date: "2026-01-01" }))).toBe("Monthly on the 1st");
    expect(describeSchedule(rem({ schedule: "monthly", on_date: "2026-01-22" }))).toBe("Monthly on the 22nd");
    expect(describeSchedule(rem({ schedule: "monthly", on_date: "2026-01-13" }))).toBe("Monthly on the 13th");
    expect(describeSchedule(rem({ schedule: "yearly", on_date: "2026-03-03" }))).toBe("Every year on 3 Mar");
    expect(describeSchedule(rem({ schedule: "once", on_date: "2026-10-20" }))).toBe("On Tue, 20 Oct 2026");
  });
});

describe("reminderSchema + cleanReminder", () => {
  const base: ReminderInput = { id, text: "Water plants", schedule: "daily", days_of_week: [], on_date: null, active: true };

  it("accepts a valid daily reminder", () => {
    expect(reminderSchema.safeParse(base).success).toBe(true);
  });
  it("rejects empty text, over-long text, weekly without days, and dated schedules without a date", () => {
    expect(reminderSchema.safeParse({ ...base, text: "  " }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, text: "x".repeat(201) }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, schedule: "weekly" }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, schedule: "once" }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, days_of_week: [7] }).success).toBe(false);
  });
  it("drops fields the schedule doesn't use and de-duplicates days", () => {
    expect(cleanReminder({ ...base, days_of_week: [1], on_date: "2026-01-01" })).toMatchObject({
      days_of_week: [],
      on_date: null,
    });
    expect(cleanReminder({ ...base, schedule: "weekly", days_of_week: [5, 1, 5] }).days_of_week).toEqual([1, 5]);
    expect(cleanReminder({ ...base, text: "  Gym  " }).text).toBe("Gym");
  });
});

describe("sortReminders", () => {
  it("puts due-today first, then by next date, paused last", () => {
    const list = [
      rem({ id: "paused", active: false }),
      rem({ id: "sat", schedule: "weekly", days_of_week: [6] }),
      rem({ id: "daily" }),
    ];
    expect(sortReminders(list, "2026-10-20").map((r) => r.id)).toEqual(["daily", "sat", "paused"]);
  });
});
