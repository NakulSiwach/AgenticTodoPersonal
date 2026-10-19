"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CalendarDays, UserRound } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { useTodos } from "@/lib/queries";
import { useToday } from "@/lib/useToday";
import { AccountSettings } from "./AccountSettings";
import { CalendarView } from "./CalendarView";
import { GoogleCalendarSettings } from "./GoogleCalendarSettings";
import { NotificationSettings } from "./NotificationSettings";
import { TopActions } from "./ProfileMenu";
import { useToast } from "./Toast";

// Outcome codes from /api/gcal/callback (`/profile?gcal=…&reason=…`).
const GCAL_MESSAGES: Record<string, string> = {
  connected: "Google Calendar connected. Tasks with a due date are now in your TaskFlow calendar.",
  denied: "Google Calendar wasn't connected: access was declined.",
  expired: "The Google sign-in expired or didn't match. Please try again.",
  scope: "Calendar access wasn't granted. Connect again and tick the calendar permission.",
  "not-configured": "Google Calendar sync isn't set up on the server yet.",
  migration: "Database needs the latest update: run supabase/migrations/0004_google_calendar.sql",
  failed: "Couldn't connect Google Calendar. Please try again.",
};

/** Shows the result of the Google connect flow once, then cleans the URL. */
function useGcalOutcome() {
  const toast = useToast();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("gcal");
    if (!outcome) return;
    const key = outcome === "connected" ? "connected" : (params.get("reason") ?? "failed");
    toast.push({ message: GCAL_MESSAGES[key] ?? GCAL_MESSAGES.failed });
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

type Tab = "calendar" | "notifications" | "account";

const TABS: { id: Tab; label: string; Icon: typeof Bell }[] = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "account", label: "Account", Icon: UserRound },
];

export function ProfileApp({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("calendar");
  const { data: profile } = useProfile();
  const { data: todos = [], isLoading, isError, error } = useTodos();
  const today = useToday();
  useGcalOutcome();

  const name = profile?.display_name || email.split("@")[0] || "You";
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-[var(--background)]/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur dark:border-neutral-800">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Link
            href="/"
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-medium hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Tasks
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold sm:text-left">Profile</h1>
          <TopActions email={email} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5 pb-16">
        <section className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{name}</p>
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{email}</p>
          </div>
        </section>

        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex gap-1 overflow-x-auto rounded-2xl bg-neutral-200/70 p-1 dark:bg-neutral-800/70"
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`inline-flex min-h-10 flex-1 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === id
                  ? "bg-white shadow-sm dark:bg-neutral-950"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="space-y-5">
          {tab === "calendar" && <GoogleCalendarSettings />}
          {tab === "calendar" &&
            (isError ? (
              <p role="alert" className="text-red-600 dark:text-red-400">
                Couldn&apos;t load your tasks{error instanceof Error ? `: ${error.message}` : ""}.
              </p>
            ) : isLoading ? (
              <div className="h-96 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            ) : (
              <>
                <CalendarView todos={todos} today={today} />
                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  Tasks without a due date aren&apos;t shown here, except finished ones, which appear on the day you
                  completed them.
                </p>
              </>
            ))}
          {tab === "notifications" && <NotificationSettings />}
          {tab === "account" && <AccountSettings email={email} />}
        </div>
      </main>
    </div>
  );
}
