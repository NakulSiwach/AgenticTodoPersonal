import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ToastProvider } from "@/components/Toast";
import { quoteForDate } from "@/lib/quotes";
import { today } from "@/lib/dates";

const upsert = vi.fn();
let profileRow: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ maybeSingle: async () => ({ data: profileRow, error: null }) }),
      upsert: (patch: Record<string, unknown>) => {
        upsert(patch);
        return { select: () => ({ single: async () => ({ data: { ...profileRow, ...patch }, error: null }) }) };
      },
    }),
  }),
}));

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <NotificationSettings />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  upsert.mockReset();
  profileRow = { email_digest_enabled: true, email_digest_time: "09:00:00", timezone: "UTC" };
});

describe("Thought for the day setting", () => {
  it("is on by default and previews today's quote", async () => {
    renderSettings();
    const toggle = await screen.findByRole("switch", { name: "Add a thought for the day" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    const q = quoteForDate(today());
    const figure = screen.getByRole("figure", { name: "Today's quote" });
    expect(figure).toHaveTextContent(q.text);
    expect(figure).toHaveTextContent(q.author);
  });

  it("saves the change, and only sends the quote field when it changed", async () => {
    renderSettings();
    await userEvent.click(await screen.findByRole("switch", { name: "Add a thought for the day" }));
    expect(screen.queryByRole("figure", { name: "Today's quote" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ digest_quote_enabled: false }));
  });

  it("leaves the quote field out when only the time changes", async () => {
    renderSettings();
    await userEvent.click(await screen.findByRole("button", { name: "7:00 AM" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).not.toHaveProperty("digest_quote_enabled");
  });

  it("respects a saved 'off'", async () => {
    profileRow = { ...profileRow, digest_quote_enabled: false };
    renderSettings();
    const toggle = await screen.findByRole("switch", { name: "Add a thought for the day" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
