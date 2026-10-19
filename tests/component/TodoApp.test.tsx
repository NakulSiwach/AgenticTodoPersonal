import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/Toast";
import { TodoApp } from "@/components/TodoApp";
import type { Subtask, Todo } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock("@/lib/todos", () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import * as api from "@/lib/todos";

const base = {
  user_id: "u",
  notes: null,
  completed_at: null,
  text_color: null,
  highlight_color: null,
  due_date: null,
  list_name: null,
  tags: [] as string[],
  subtasks: [] as Subtask[],
  repeat: null,
  sort_order: null,
  updated_at: "2026-01-01T00:00:00Z",
} as const;

const seed: Todo[] = [
  { ...base, id: "1", title: "Write report", priority: 1, completed: false, created_at: "2026-01-02T00:00:00Z" },
  { ...base, id: "2", title: "Buy milk", priority: 3, completed: false, created_at: "2026-01-01T00:00:00Z" },
];

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TodoApp email="me@example.com" />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

let db: Todo[] = [];

// A tiny in-memory "server" so refetches after a mutation see the saved state.
beforeEach(() => {
  vi.resetAllMocks();
  db = structuredClone(seed);
  vi.mocked(api.listTodos).mockImplementation(async () => structuredClone(db));
  vi.mocked(api.updateTodo).mockImplementation(async (id, patch) => {
    db = db.map((t) => (t.id === id ? { ...t, ...patch } : t));
    return db.find((t) => t.id === id)!;
  });
  vi.mocked(api.createTodo).mockImplementation(async (input) => {
    const created: Todo = {
      ...base,
      id: input.id,
      title: input.title,
      priority: input.priority,
      due_date: input.due_date ?? null,
      list_name: input.list_name ?? null,
      tags: input.tags ?? [],
      repeat: input.repeat ?? null,
      completed: false,
      created_at: "2026-01-03T00:00:00Z",
    };
    db = [created, ...db];
    return created;
  });
});

async function loaded() {
  await screen.findByText("Write report");
}

describe("TodoApp", () => {
  it("lists todos in priority order with an active count", async () => {
    renderApp();
    await loaded();
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Write report");
    expect(rows[1]).toHaveTextContent("Buy milk");
    expect(screen.getByText("2 active")).toBeInTheDocument();
  });

  it("toggles complete instantly and persists", async () => {
    renderApp();
    const box = await screen.findByLabelText(/Mark as done: Write report/);
    await userEvent.click(box);
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith("1", { completed: true }));
    // The finished task moves to the Completed section (open by default), with an undo toast.
    expect(await screen.findByText("Task completed")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mark as done: Write report/)).not.toBeInTheDocument();
    expect(await screen.findByLabelText(/Mark as not done: Write report/)).toBeChecked();
  });

  it("undoes a completion from the toast", async () => {
    renderApp();
    await userEvent.click(await screen.findByLabelText(/Mark as done: Write report/));
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() =>
      expect(api.updateTodo).toHaveBeenLastCalledWith("1", { completed: false }),
    );
    expect(await screen.findByLabelText(/Mark as done: Write report/)).not.toBeChecked();
  });

  it("moves a repeating task to its next date instead of completing it", async () => {
    db = [{ ...seed[0], due_date: "2000-01-01", repeat: "daily" }, seed[1]];
    renderApp();
    await userEvent.click(await screen.findByLabelText(/Mark as done: Write report/));
    await waitFor(() =>
      expect(api.updateTodo).toHaveBeenCalledWith("1", {
        due_date: expect.stringMatching(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
      }),
    );
    expect(vi.mocked(api.updateTodo).mock.calls[0][1]).not.toHaveProperty("completed");
    expect(await screen.findByText(/Done. Next:/)).toBeInTheDocument();
  });

  it("reverts the toggle and shows a toast when the server rejects", async () => {
    vi.mocked(api.updateTodo).mockRejectedValue(new Error("boom"));
    renderApp();
    await userEvent.click(await screen.findByLabelText(/Mark as done: Write report/));
    await waitFor(() =>
      expect(screen.getByLabelText(/Mark as done: Write report/)).not.toBeChecked(),
    );
    expect(await screen.findByText(/Could not save change: boom/)).toBeInTheDocument();
  });

  it("rejects an empty title with an inline message", async () => {
    renderApp();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/required/i);
    expect(api.createTodo).not.toHaveBeenCalled();
  });

  it("adds a todo with the chosen priority", async () => {
    renderApp();
    await loaded();
    await userEvent.type(screen.getByLabelText("New todo"), "Urgent thing");
    await userEvent.click(screen.getByRole("button", { name: "Priority" }));
    await userEvent.click(screen.getByRole("option", { name: "P0" }));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(api.createTodo).toHaveBeenCalledWith({
      id: expect.any(String),
      title: "Urgent thing",
      priority: 0,
    });
    expect(await screen.findByText("Urgent thing")).toBeInTheDocument();
  });

  it("holds an update until the todo's insert has been saved", async () => {
    let finishInsert!: () => void;
    vi.mocked(api.createTodo).mockImplementation(
      (input) =>
        new Promise((resolve) => {
          finishInsert = () => {
            const created = { ...base, id: input.id, title: input.title, priority: input.priority,
              completed: false, created_at: "2026-01-03T00:00:00Z" } as Todo;
            db = [created, ...db];
            resolve(created);
          };
        }),
    );
    renderApp();
    await loaded();
    await userEvent.type(screen.getByLabelText("New todo"), "Quick one");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await userEvent.click(await screen.findByLabelText(/Mark as done: Quick one/));
    expect(api.updateTodo).not.toHaveBeenCalled();
    finishInsert();
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Task completed")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mark as done: Quick one/)).not.toBeInTheDocument();
  });

  it("shows finished tasks in the Completed view", async () => {
    db = [{ ...seed[0], completed: true }, seed[1]];
    renderApp();
    await screen.findByText("Buy milk");
    await userEvent.click(screen.getByRole("button", { name: "Completed" }));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Write report");
  });

  it("parses quick-add text into date, priority, list and tags", async () => {
    renderApp();
    await loaded();
    await userEvent.type(screen.getByLabelText("New todo"), "Pay rent tomorrow !1 #Home @bills");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(api.createTodo).toHaveBeenCalledWith({
        id: expect.any(String),
        title: "Pay rent",
        priority: 1,
        due_date: expect.stringMatching(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
        list_name: "Home",
        tags: ["bills"],
      }),
    );
  });

  it("shows the Completed section open by default", async () => {
    db = [{ ...seed[0], completed: true }, seed[1]];
    renderApp();
    expect(await screen.findByLabelText(/Mark as not done: Write report/)).toBeVisible();
  });

  it("changes a task's priority from the row dropdown", async () => {
    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: "Change priority of Buy milk" }));
    await userEvent.click(screen.getByRole("option", { name: "P0" }));
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith("2", { priority: 0 }));
  });

  it("closes a dropdown with Escape without closing the sheet", async () => {
    renderApp();
    await userEvent.click(await screen.findByLabelText("Edit: Write report"));
    const sheet = within(screen.getByRole("dialog"));
    await userEvent.click(sheet.getByRole("button", { name: "Repeat" }));
    expect(screen.getByRole("listbox", { name: "Repeat" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("adds a task with a one-tap quick tag", async () => {
    renderApp();
    await loaded();
    await userEvent.type(screen.getByLabelText("New todo"), "Send invoice");
    await userEvent.click(within(screen.getByRole("group", { name: "Quick tags" })).getByRole("button", { name: "Office" }));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(api.createTodo).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Send invoice", tags: ["Office"] }),
      ),
    );
  });

  it("explains the quick-add syntax", async () => {
    renderApp();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "Quick-add tips" }));
    expect(screen.getByText(/#ListName puts the task in that list/)).toBeInTheDocument();
    expect(screen.getByText(/@tag adds a label/)).toBeInTheDocument();
  });

  it("orders by priority by default and shows drag handles", async () => {
    renderApp();
    await loaded();
    expect(screen.getByRole("button", { name: "Sort by" })).toHaveTextContent("Priority (default)");
    expect(screen.getByRole("button", { name: "Reorder: Write report" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reorder: Buy milk" })).toBeInTheDocument();
  });

  it("hides drag handles when sorted another way and in the Completed view", async () => {
    renderApp();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "Sort by" }));
    await userEvent.click(screen.getByRole("option", { name: "A to Z" }));
    expect(screen.queryByRole("button", { name: /^Reorder:/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sort by" }));
    await userEvent.click(screen.getByRole("option", { name: "Manual order" }));
    expect(screen.getByRole("button", { name: "Reorder: Write report" })).toBeInTheDocument();
  });

  it("has the theme toggle and profile menu in the top bar", async () => {
    renderApp();
    await loaded();
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("button", { name: /theme/i })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Profile menu" })).toBeInTheDocument();
  });

  it("searches across all tasks", async () => {
    renderApp();
    await loaded();
    await userEvent.type(screen.getByLabelText("Search tasks"), "milk");
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Buy milk");
    await userEvent.clear(screen.getByLabelText("Search tasks"));
    await userEvent.type(screen.getByLabelText("Search tasks"), "zzz");
    expect(screen.getByText("No matching tasks")).toBeInTheDocument();
  });

  it("filters by list from the sidebar", async () => {
    db = [{ ...seed[0], list_name: "Work" }, seed[1]];
    renderApp();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: /^Work/ }));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Write report");
  });

  it("saves due date, subtasks and tags from the edit sheet", async () => {
    renderApp();
    await userEvent.click(await screen.findByLabelText("Edit: Write report"));
    const sheet = within(screen.getByRole("dialog"));
    await userEvent.click(sheet.getByRole("button", { name: "Tomorrow" }));
    await userEvent.type(sheet.getByLabelText("New subtask"), "Outline{Enter}");
    await userEvent.type(sheet.getByLabelText("Tags"), "work{Enter}");
    await userEvent.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(api.updateTodo).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          due_date: expect.stringMatching(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
          tags: ["work"],
          subtasks: [expect.objectContaining({ title: "Outline", done: false })],
        }),
      ),
    );
  });

  it("saves colors from the edit sheet", async () => {
    renderApp();
    await userEvent.click(await screen.findByLabelText("Edit: Write report"));
    await userEvent.click(screen.getByRole("radio", { name: "Text color: red" }));
    await userEvent.click(screen.getByRole("radio", { name: "Highlight color: yellow" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.updateTodo).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ text_color: "red", highlight_color: "yellow" }),
    );
  });

  it("deletes with an undo window", async () => {
    renderApp();
    await userEvent.click(await screen.findByLabelText("Edit: Buy milk"));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(api.deleteTodo).not.toHaveBeenCalled();
  });
});
