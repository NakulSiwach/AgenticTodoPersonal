import { describe, expect, it } from "vitest";
import { buildEvent, eventIdFor, planSync, type SyncTodo } from "@/lib/gcalEvents";

const APP = "https://app.example";

function todo(over: Partial<SyncTodo> = {}): SyncTodo {
  return {
    id: "3f2b9c1e-8a4d-4e6f-9b1a-0c2d3e4f5a6b",
    title: "Pay rent",
    notes: null,
    priority: 1,
    completed: false,
    due_date: "2026-10-31",
    list_name: null,
    tags: [],
    subtasks: [],
    repeat: null,
    ...over,
  };
}

describe("eventIdFor", () => {
  it("turns a UUID into a valid Google event id (base32hex, 5-1024 chars)", () => {
    const id = eventIdFor("3F2B9C1E-8A4D-4E6F-9B1A-0C2D3E4F5A6B");
    expect(id).toBe("3f2b9c1e8a4d4e6f9b1a0c2d3e4f5a6b");
    expect(id).toMatch(/^[0-9a-v]{5,1024}$/);
  });
});

describe("buildEvent", () => {
  it("skips tasks without a due date", () => {
    expect(buildEvent(todo({ due_date: null }), APP)).toBeNull();
  });

  it("makes an all-day, free event ending the next day (month and year rollover)", () => {
    const e = buildEvent(todo({ due_date: "2026-12-31" }), APP)!;
    expect(e.start).toEqual({ date: "2026-12-31" });
    expect(e.end).toEqual({ date: "2027-01-01" });
    expect(e.transparency).toBe("transparent");
    expect(e.summary).toBe("Pay rent");
    expect(e.colorId).toBe("6"); // P1 → Tangerine
    expect(e.recurrence).toBeUndefined();
    expect(e.extendedProperties.private.taskflow).toBe("1");
  });

  it("marks finished tasks with a tick, greys them, and drops the repeat", () => {
    const e = buildEvent(todo({ completed: true, repeat: "weekly" }), APP)!;
    expect(e.summary).toBe("✓ Pay rent");
    expect(e.colorId).toBe("8");
    expect(e.recurrence).toBeUndefined();
  });

  it.each([
    ["daily", "RRULE:FREQ=DAILY"],
    ["weekdays", "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"],
    ["weekly", "RRULE:FREQ=WEEKLY"],
    ["monthly", "RRULE:FREQ=MONTHLY"],
    ["yearly", "RRULE:FREQ=YEARLY"],
  ] as const)("maps repeat %s to %s", (repeat, rule) => {
    expect(buildEvent(todo({ repeat }), APP)!.recurrence).toEqual([rule]);
  });

  it("puts priority, list, tags, subtasks, notes and a link in the description", () => {
    const e = buildEvent(
      todo({
        priority: 0,
        list_name: "Home",
        tags: ["bills", "urgent"],
        subtasks: [
          { id: "a", title: "Find invoice", done: true },
          { id: "b", title: "Transfer", done: false },
        ],
        notes: "  Landlord's IBAN in email  ",
      }),
      APP,
    )!;
    expect(e.description).toBe(
      [
        "Priority: P0 · List: Home · Tags: @bills @urgent",
        "Subtasks (1/2):\n☑ Find invoice\n☐ Transfer",
        "Landlord's IBAN in email",
        `Open in TaskFlow: ${APP}`,
      ].join("\n\n"),
    );
    expect(e.colorId).toBe("11");
  });

  it("gives the same fingerprint for the same task and a new one when it changes", () => {
    const a = buildEvent(todo(), APP)!.extendedProperties.private.tfhash;
    expect(buildEvent(todo(), APP)!.extendedProperties.private.tfhash).toBe(a);
    expect(buildEvent(todo({ title: "Pay rent!" }), APP)!.extendedProperties.private.tfhash).not.toBe(a);
    expect(buildEvent(todo({ due_date: "2026-11-01" }), APP)!.extendedProperties.private.tfhash).not.toBe(a);
  });
});

describe("planSync", () => {
  const t1 = todo({ id: "00000000-0000-4000-8000-000000000001", title: "One" });
  const t2 = todo({ id: "00000000-0000-4000-8000-000000000002", title: "Two" });
  const hashOf = (t: SyncTodo) => buildEvent(t, APP)!.extendedProperties.private.tfhash;

  it("inserts events Google doesn't have yet, and ignores undated tasks", () => {
    const plan = planSync([t1, todo({ id: "00000000-0000-4000-8000-000000000003", due_date: null })], [], APP);
    expect(plan.upserts).toHaveLength(1);
    expect(plan.upserts[0]).toMatchObject({ exists: false, event: { id: eventIdFor(t1.id) } });
    expect(plan.deletes).toEqual([]);
  });

  it("skips unchanged events and updates changed ones", () => {
    const plan = planSync(
      [t1, t2],
      [
        { id: eventIdFor(t1.id), hash: hashOf(t1) },
        { id: eventIdFor(t2.id), hash: "stale" },
      ],
      APP,
    );
    expect(plan.upserts).toEqual([{ exists: true, event: buildEvent(t2, APP) }]);
  });

  it("deletes events whose task is gone or lost its due date", () => {
    const plan = planSync(
      [{ ...t1, due_date: null }],
      [
        { id: eventIdFor(t1.id), hash: hashOf(t1) },
        { id: "deadbeefdeadbeef", hash: "x" },
      ],
      APP,
    );
    expect(plan.upserts).toEqual([]);
    expect(plan.deletes.sort()).toEqual([eventIdFor(t1.id), "deadbeefdeadbeef"].sort());
  });
});
