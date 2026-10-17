import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/Toast";
import { TodoApp } from "@/components/TodoApp";
import type { Todo } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
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
      id: "new-1",
      title: input.title,
      priority: input.priority,
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
    expect(await screen.findByLabelText(/Mark as not done: Write report/)).toBeChecked();
    expect(api.updateTodo).toHaveBeenCalledWith("1", { completed: true });
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
    await userEvent.click(screen.getByRole("radio", { name: "P0" }));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(api.createTodo).toHaveBeenCalledWith({ title: "Urgent thing", priority: 0 });
    expect(await screen.findByText("Urgent thing")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    db = [{ ...seed[0], completed: true }, seed[1]];
    renderApp();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "Completed" }));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Write report");
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
