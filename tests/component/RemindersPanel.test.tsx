import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RemindersPanel, TodayReminders } from "@/components/RemindersPanel";
import { ToastProvider } from "@/components/Toast";
import type { Reminder, ReminderInput } from "@/lib/reminders";

vi.mock("@/lib/reminderApi", () => ({
  listReminders: vi.fn(),
  saveReminder: vi.fn(),
  deleteReminder: vi.fn(),
}));
import * as api from "@/lib/reminderApi";

const TODAY = "2026-10-20"; // Tuesday
let db: Reminder[] = [];

function row(input: ReminderInput): Reminder {
  return { ...input, user_id: "u", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
}

beforeEach(() => {
  vi.resetAllMocks();
  db = [
    row({ id: "11111111-1111-4111-8111-111111111111", text: "Take medicines", schedule: "daily", days_of_week: [], on_date: null, active: true }),
    row({ id: "22222222-2222-4222-8222-222222222222", text: "Water the plants", schedule: "weekly", days_of_week: [6], on_date: null, active: true }),
  ];
  vi.mocked(api.listReminders).mockImplementation(async () => structuredClone(db));
  vi.mocked(api.saveReminder).mockImplementation(async (input) => {
    const saved = row({ ...input, text: input.text.trim() });
    db = db.some((r) => r.id === input.id) ? db.map((r) => (r.id === input.id ? saved : r)) : [...db, saved];
    return saved;
  });
  vi.mocked(api.deleteReminder).mockImplementation(async (id) => {
    db = db.filter((r) => r.id !== id);
  });
});

/** The list of saved reminders (the idea chips above it reuse some of the same words). */
const list = () => screen.findByRole("region", { name: "All reminders" });

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

describe("RemindersPanel", () => {
  it("shows what is due today and every reminder with its schedule", async () => {
    renderWith(<RemindersPanel today={TODAY} />);
    const todays = await screen.findByRole("region", { name: "Due today" });
    expect(within(todays).getByText("Take medicines")).toBeInTheDocument();
    expect(within(todays).queryByText("Water the plants")).not.toBeInTheDocument();
    const all = screen.getByRole("region", { name: "All reminders" });
    expect(within(all).getByText(/Every Sat/)).toBeInTheDocument();
    expect(within(all).getByText(/Next: Sat/)).toBeInTheDocument();
  });

  it("adds a weekly reminder on chosen days", async () => {
    renderWith(<RemindersPanel today={TODAY} />);
    await list();
    await userEvent.type(screen.getByLabelText("Reminder"), "Go to the gym");
    await userEvent.click(screen.getByRole("button", { name: "How often" }));
    await userEvent.click(screen.getByRole("option", { name: /Specific days of the week/ }));
    const days = screen.getByRole("group", { name: "Days of the week" });
    await userEvent.click(within(days).getByRole("button", { name: "Tue" }));
    await userEvent.click(within(days).getByRole("button", { name: "Thu" }));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(api.saveReminder).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Go to the gym", schedule: "weekly", days_of_week: [2, 4] }),
    );
    const todays = screen.getByRole("region", { name: "Due today" });
    expect(await within(todays).findByText("Go to the gym")).toBeInTheDocument();
    expect(screen.getByLabelText("Reminder")).toHaveValue("");
  });

  it("asks for days when weekly has none, and rejects empty text", async () => {
    renderWith(<RemindersPanel today={TODAY} />);
    await list();
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Write what to remind you about/);
    await userEvent.type(screen.getByLabelText("Reminder"), "Gym");
    await userEvent.click(screen.getByRole("button", { name: "How often" }));
    await userEvent.click(screen.getByRole("option", { name: /Specific days of the week/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Pick at least one day/);
    expect(api.saveReminder).not.toHaveBeenCalled();
  });

  it("fills the text from a one-tap idea", async () => {
    renderWith(<RemindersPanel today={TODAY} />);
    await list();
    await userEvent.click(screen.getByRole("button", { name: "Drink water" }));
    expect(screen.getByLabelText("Reminder")).toHaveValue("Drink water");
  });

  it("pauses a reminder so it is no longer due today", async () => {
    renderWith(<RemindersPanel today={TODAY} />);
    await list();
    await userEvent.click(screen.getByRole("switch", { name: "Pause: Take medicines" }));
    expect(api.saveReminder).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    const todays = screen.getByRole("region", { name: "Due today" });
    await waitFor(() => expect(within(todays).queryByText("Take medicines")).not.toBeInTheDocument());
    expect(screen.getByRole("switch", { name: "Resume: Take medicines" })).toBeInTheDocument();
  });

  it("edits a reminder in place", async () => {
    renderWith(<RemindersPanel today={TODAY} />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit reminder: Water the plants" }));
    const form = screen.getByRole("form", { name: "Edit reminder" });
    const input = within(form).getByLabelText("Reminder");
    await userEvent.clear(input);
    await userEvent.type(input, "Water the balcony plants");
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));
    expect(api.saveReminder).toHaveBeenCalledWith(expect.objectContaining({ text: "Water the balcony plants" }));
    expect(await within(await list()).findByText("Water the balcony plants")).toBeInTheDocument();
  });

  it("deletes with undo", async () => {
    renderWith(<RemindersPanel today={TODAY} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete reminder: Water the plants" }));
    expect(within(await list()).queryByText("Water the plants")).not.toBeInTheDocument();
    await waitFor(() => expect(api.deleteReminder).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(await within(await list()).findByText("Water the plants")).toBeInTheDocument();
    expect(api.saveReminder).toHaveBeenLastCalledWith(expect.objectContaining({ text: "Water the plants" }));
  });

  it("rolls back and explains when saving fails", async () => {
    vi.mocked(api.saveReminder).mockRejectedValue(new Error("Database needs the latest update"));
    renderWith(<RemindersPanel today={TODAY} />);
    await list();
    await userEvent.type(screen.getByLabelText("Reminder"), "Stretch");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText(/Could not save reminder: Database needs the latest update/)).toBeInTheDocument();
    await waitFor(async () => expect(within(await list()).queryByText("Stretch")).not.toBeInTheDocument());
  });

  it("shows the load error (e.g. migration not applied)", async () => {
    vi.mocked(api.listReminders).mockRejectedValue(new Error("Database needs the latest update: run 0005"));
    renderWith(<RemindersPanel today={TODAY} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/run 0005/);
  });
});

describe("TodayReminders", () => {
  it("lists only today's reminders and links to the section", async () => {
    const onOpen = vi.fn();
    renderWith(<TodayReminders today={TODAY} onOpen={onOpen} />);
    const card = await screen.findByRole("region", { name: "Today's reminders" });
    expect(within(card).getByText(/Take medicines/)).toBeInTheDocument();
    expect(within(card).queryByText(/Water the plants/)).not.toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Manage" }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("renders nothing when nothing is due", async () => {
    db = [];
    const { container } = renderWith(<TodayReminders today={TODAY} onOpen={() => {}} />);
    await waitFor(() => expect(api.listReminders).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
  });
});
