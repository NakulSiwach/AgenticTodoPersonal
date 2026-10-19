import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { GCAL_KEY, scheduleCalendarSync, SYNC_DELAY_MS } from "@/lib/gcalClient";
import type { GcalStatus } from "@/lib/types";

const status = (connected: boolean): GcalStatus => ({
  configured: true,
  connected,
  email: null,
  lastSyncedAt: null,
  lastError: null,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ created: 1, updated: 0, deleted: 0, failed: 0, remaining: 0, status: status(true) }),
  }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("scheduleCalendarSync", () => {
  it("does nothing when Google Calendar isn't connected", async () => {
    const qc = new QueryClient();
    qc.setQueryData(GCAL_KEY, status(false));
    scheduleCalendarSync(qc);
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS * 2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns a burst of task changes into one sync after a quiet period", async () => {
    const qc = new QueryClient();
    qc.setQueryData(GCAL_KEY, status(true));
    scheduleCalendarSync(qc);
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS - 500);
    scheduleCalendarSync(qc);
    scheduleCalendarSync(qc);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/gcal/sync", expect.objectContaining({ method: "POST" }));
  });

  it("keeps going while the server reports work remaining", async () => {
    const qc = new QueryClient();
    qc.setQueryData(GCAL_KEY, status(true));
    let left = 2;
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ created: 1, updated: 0, deleted: 0, failed: 0, remaining: left--, status: status(true) }),
    }));
    scheduleCalendarSync(qc);
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(3); // remaining 2 → 1 → 0
  });
});
