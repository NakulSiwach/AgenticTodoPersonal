import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { ToastProvider } from "@/components/Toast";
import type { GcalStatus } from "@/lib/types";

const connected: GcalStatus = {
  configured: true,
  connected: true,
  email: "me@gmail.com",
  lastSyncedAt: new Date().toISOString(),
  lastError: null,
};

type Route = (init?: RequestInit) => { status?: number; body: unknown };

function stubServer(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { status = 200, body } = routes[url](init);
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <GoogleCalendarSettings />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("GoogleCalendarSettings", () => {
  it("explains when the server isn't set up", async () => {
    stubServer({ "/api/gcal": () => ({ body: { ...connected, configured: false, connected: false } }) });
    renderCard();
    expect(await screen.findByText(/isn't set up on the server yet/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Connect Google Calendar" })).not.toBeInTheDocument();
  });

  it("offers to connect, passing the browser's timezone", async () => {
    stubServer({ "/api/gcal": () => ({ body: { ...connected, connected: false, email: null } }) });
    renderCard();
    const link = await screen.findByRole("link", { name: "Connect Google Calendar" });
    expect(link.getAttribute("href")).toMatch(/^\/api\/gcal\/connect\?tz=.+/);
  });

  it("shows the linked account and syncs on demand", async () => {
    const fetchMock = stubServer({
      "/api/gcal": () => ({ body: connected }),
      "/api/gcal/sync": () => ({
        body: { created: 2, updated: 1, deleted: 0, failed: 0, remaining: 0, status: connected },
      }),
    });
    renderCard();
    expect(await screen.findByText("me@gmail.com")).toBeInTheDocument();
    expect(screen.getByText(/Last synced just now/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sync now" }));
    expect(await screen.findByText("Synced 3 changes to Google Calendar.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/gcal/sync", expect.objectContaining({ method: "POST" }));
  });

  it("shows a stored error with a reconnect link", async () => {
    stubServer({
      "/api/gcal": () => ({
        body: { ...connected, lastError: "Google access was removed or expired. Reconnect Google Calendar." },
      }),
    });
    renderCard();
    expect(await screen.findByRole("alert")).toHaveTextContent("Google access was removed");
    expect(screen.getByRole("link", { name: "Reconnect Google Calendar" })).toBeInTheDocument();
  });

  it("disconnects after confirming, optionally deleting the calendar", async () => {
    let sent: unknown = null;
    stubServer({
      "/api/gcal": () => ({ body: connected }),
      "/api/gcal/disconnect": (init) => {
        sent = JSON.parse(String(init?.body));
        return { body: { ok: true, calendarRemoved: true, status: { ...connected, connected: false, email: null } } };
      },
    });
    renderCard();
    await userEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Also delete the TaskFlow calendar/ }));
    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(await screen.findByText(/removed the TaskFlow calendar/)).toBeInTheDocument();
    expect(sent).toEqual({ removeCalendar: true });
    expect(await screen.findByRole("link", { name: "Connect Google Calendar" })).toBeInTheDocument();
  });
});
