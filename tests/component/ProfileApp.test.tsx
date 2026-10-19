import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfileApp } from "@/components/ProfileApp";
import { ToastProvider } from "@/components/Toast";
import { today } from "@/lib/dates";
import type { Todo } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/profile",
}));

const upsert = vi.fn();
let profileRow: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: vi.fn() },
    from: () => ({
      select: () => ({ maybeSingle: async () => ({ data: profileRow, error: null }) }),
      upsert: (patch: Record<string, unknown>) => {
        upsert(patch);
        return {
          select: () => ({
            single: async () => ({ data: { ...profileRow, ...patch }, error: null }),
          }),
        };
      },
    }),
  }),
}));

vi.mock("@/lib/todos", () => ({ listTodos: vi.fn() }));
import * as api from "@/lib/todos";

const todo: Todo = {
  id: "1",
  user_id: "u",
  title: "Send invoice",
  notes: null,
  priority: 1,
  completed: false,
  completed_at: null,
  text_color: null,
  highlight_color: null,
  due_date: today(),
  list_name: null,
  tags: [],
  subtasks: [],
  repeat: null,
  sort_order: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderProfile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ProfileApp email="asha@example.com" />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  profileRow = null;
  vi.mocked(api.listTodos).mockResolvedValue([todo]);
  upsert.mockReset();
});

describe("ProfileApp", () => {
  it("shows the account header and the calendar by default", async () => {
    renderProfile();
    expect(screen.getByText("asha@example.com")).toBeInTheDocument();
    expect(await screen.findByRole("grid")).toBeInTheDocument();
    const day = await screen.findByRole("region", { name: "Selected day" });
    expect(within(day).getByText("Send invoice")).toBeInTheDocument();
    expect(screen.getByText("Pending this month")).toBeInTheDocument();
  });

  it("turns on the daily email, picks a time and saves", async () => {
    renderProfile();
    await userEvent.click(screen.getByRole("tab", { name: "Notifications" }));
    const toggle = await screen.findByRole("switch", { name: "Daily email digest" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("button", { name: "7:00 AM" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith({
        email_digest_enabled: true,
        email_digest_time: "07:00",
        timezone: expect.any(String),
      }),
    );
  });

  it("sends a test email and reports success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, to: "asha@example.com", count: 3 }),
      }),
    );
    renderProfile();
    await userEvent.click(screen.getByRole("tab", { name: "Notifications" }));
    await userEvent.click(await screen.findByRole("button", { name: /Send me a test email/ }));
    const result = await screen.findByText(/Sent to asha@example.com/);
    expect(result).toHaveTextContent("3 tasks");
    vi.unstubAllGlobals();
  });

  it("shows the server's reason when the test email fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: "Email is not set up on the server yet (missing RESEND_API_KEY)." }),
      }),
    );
    renderProfile();
    await userEvent.click(screen.getByRole("tab", { name: "Notifications" }));
    await userEvent.click(await screen.findByRole("button", { name: /Send me a test email/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("missing RESEND_API_KEY");
    vi.unstubAllGlobals();
  });

  it("saves the display name", async () => {
    renderProfile();
    await userEvent.click(screen.getByRole("tab", { name: "Account" }));
    await userEvent.type(await screen.findByLabelText("Display name"), "Asha");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(upsert).toHaveBeenCalledWith({ display_name: "Asha" }));
  });

  it("offers the profile menu with sign out at the top right", async () => {
    renderProfile();
    await userEvent.click(screen.getByRole("button", { name: "Profile menu" }));
    expect(screen.getByRole("option", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Profile & settings" })).toHaveAttribute("aria-selected", "true");
  });
});
