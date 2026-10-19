"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarSync, RefreshCw, Unlink } from "lucide-react";
import { disconnectCalendar, syncCalendar, useGcalStatus } from "@/lib/gcalClient";
import { browserTimezone } from "@/lib/profile";
import { useToast } from "./Toast";

function ago(iso: string, now: number = Date.now()): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

const card = "rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
const secondaryButton =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 px-4 font-semibold hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800";
const primaryButton =
  "inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700";

export function GoogleCalendarSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: status, isLoading, isError, error } = useGcalStatus();
  const [syncing, setSyncing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removeCalendar, setRemoveCalendar] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connectHref = `/api/gcal/connect?tz=${encodeURIComponent(browserTimezone())}`;

  const syncNow = async () => {
    setSyncing(true);
    try {
      let total = 0;
      // A first sync of many tasks runs in batches; keep going until nothing is left (bounded).
      for (let round = 0; round < 10; round++) {
        const r = await syncCalendar(qc);
        total += r.created + r.updated + r.deleted;
        if (r.failed) throw new Error(r.status.lastError ?? `${r.failed} change(s) couldn't be synced`);
        if (r.remaining === 0) break;
      }
      toast.push({ message: total ? `Synced ${total} change${total === 1 ? "" : "s"} to Google Calendar.` : "Google Calendar is up to date." });
    } catch (e) {
      toast.push({ message: `Sync failed: ${(e as Error).message}` });
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const { calendarRemoved } = await disconnectCalendar(qc, removeCalendar);
      toast.push({
        message: calendarRemoved
          ? "Disconnected and removed the TaskFlow calendar from Google."
          : "Disconnected. The TaskFlow calendar stays in Google; delete it there if you like.",
      });
      setConfirming(false);
    } catch (e) {
      toast.push({ message: `Could not disconnect: ${(e as Error).message}` });
    } finally {
      setDisconnecting(false);
    }
  };

  if (isLoading) return <div className="h-28 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />;

  return (
    <section aria-labelledby="gcal-title" className={card}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-300">
          <CalendarSync size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="gcal-title" className="font-semibold">
            Google Calendar
          </h2>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Tasks with a due date appear as all-day events in a <strong>TaskFlow</strong> calendar in your Google
            account and update automatically when you change them here. TaskFlow can only see the calendar it creates.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isError ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            Couldn&apos;t load Google Calendar status{error instanceof Error ? `: ${error.message}` : ""}.
          </p>
        ) : !status?.configured ? (
          <p className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            Google Calendar sync isn&apos;t set up on the server yet. The steps are in PROJECT_STATUS.md.
          </p>
        ) : !status.connected ? (
          <a href={connectHref} className={primaryButton}>
            Connect Google Calendar
          </a>
        ) : (
          <>
            <p role="status" className="text-sm">
              Connected{status.email ? (
                <>
                  {" "}
                  as <strong>{status.email}</strong>
                </>
              ) : null}
              <span className="text-neutral-500 dark:text-neutral-400">
                {" · "}
                {status.lastSyncedAt ? `Last synced ${ago(status.lastSyncedAt)}` : "Not synced yet"}
              </span>
            </p>
            {status.lastError && (
              <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <p>{status.lastError}</p>
                {/reconnect/i.test(status.lastError) && (
                  <a href={connectHref} className="mt-2 inline-block font-semibold underline">
                    Reconnect Google Calendar
                  </a>
                )}
              </div>
            )}
            {!confirming ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={syncNow} disabled={syncing} className={secondaryButton}>
                  <RefreshCw size={16} aria-hidden="true" className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing…" : "Sync now"}
                </button>
                <button type="button" onClick={() => setConfirming(true)} className={secondaryButton}>
                  <Unlink size={16} aria-hidden="true" />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-neutral-300 p-3 dark:border-neutral-700">
                <p className="text-sm font-medium">Stop syncing to Google Calendar?</p>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={removeCalendar}
                    onChange={(e) => setRemoveCalendar(e.target.checked)}
                    className="size-5 accent-indigo-600"
                  />
                  Also delete the TaskFlow calendar from Google
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={disconnect}
                    disabled={disconnecting}
                    className="min-h-11 rounded-xl bg-red-600 px-5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
