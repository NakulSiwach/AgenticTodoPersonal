"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";
import type { GcalStatus } from "@/lib/types";

export const GCAL_KEY = ["gcal"] as const;
/** Quiet period after the last task change before pushing to Google, so a burst of taps is one sync. */
export const SYNC_DELAY_MS = 3000;

export type SyncResponse = {
  created: number;
  updated: number;
  deleted: number;
  failed: number;
  remaining: number;
  status: GcalStatus;
};

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; body: T & { error?: string } }> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && !body.error) body.error = `Request failed (${res.status})`;
  return { ok: res.ok, body };
}

export async function getGcalStatus(): Promise<GcalStatus> {
  const { ok, body } = await call<GcalStatus>("/api/gcal");
  if (!ok) throw new Error(body.error);
  return body;
}

export function useGcalStatus() {
  return useQuery({ queryKey: GCAL_KEY, queryFn: getGcalStatus, staleTime: 5 * 60_000 });
}

/** Push tasks to Google now. Updates the cached status either way. */
export async function syncCalendar(qc: QueryClient): Promise<SyncResponse> {
  const { ok, body } = await call<Partial<SyncResponse>>("/api/gcal/sync", { method: "POST" });
  if (body.status) qc.setQueryData(GCAL_KEY, body.status);
  if (!ok) throw new Error(body.error);
  return body as SyncResponse;
}

export async function disconnectCalendar(qc: QueryClient, removeCalendar: boolean) {
  const { ok, body } = await call<{ calendarRemoved?: boolean; status?: GcalStatus }>("/api/gcal/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removeCalendar }),
  });
  if (!ok) throw new Error(body.error);
  if (body.status) qc.setQueryData(GCAL_KEY, body.status);
  return { calendarRemoved: Boolean(body.calendarRemoved) };
}

// ---- Background auto-sync after task changes (one at a time, debounced) ----

let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let again = false;
let hideListener = false;

async function flush(qc: QueryClient) {
  timer = undefined;
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    const result = await syncCalendar(qc);
    if (result.remaining > 0) again = true; // big first sync: keep going in batches
  } catch (e) {
    // Shown on the Profile page via the cached status; the 15-minute job retries too.
    console.warn("Google Calendar sync failed:", (e as Error).message);
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleCalendarSync(qc, 0);
    }
  }
}

/** Call after any task write. Does nothing unless Google Calendar is connected. */
export function scheduleCalendarSync(qc: QueryClient, delay: number = SYNC_DELAY_MS) {
  if (!qc.getQueryData<GcalStatus>(GCAL_KEY)?.connected) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(qc), delay);

  // If the app is closed or backgrounded inside the quiet period, send the sync right away
  // (keepalive lets the request outlive the page).
  if (!hideListener && typeof document !== "undefined") {
    hideListener = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden" || !timer) return;
      clearTimeout(timer);
      timer = undefined;
      void fetch("/api/gcal/sync", { method: "POST", keepalive: true }).catch(() => {});
    });
  }
}
