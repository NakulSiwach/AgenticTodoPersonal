"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { browserTimezone, useProfile, useSaveProfile } from "@/lib/profile";
import type { Profile } from "@/lib/types";
import { useToast } from "./Toast";

const PRESETS = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
];

function Form({ profile }: { profile: Profile }) {
  const save = useSaveProfile();
  const toast = useToast();
  const timezone = browserTimezone();
  const [enabled, setEnabled] = useState(profile.email_digest_enabled);
  const [time, setTime] = useState(profile.email_digest_time);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const dirty =
    enabled !== profile.email_digest_enabled ||
    time !== profile.email_digest_time ||
    (enabled && timezone !== profile.timezone);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(time)) {
      toast.push({ message: "Pick a valid time" });
      return;
    }
    save.mutate(
      { email_digest_enabled: enabled, email_digest_time: time, timezone },
      {
        onSuccess: () =>
          toast.push({
            message: enabled ? `Saved. You'll get your daily email at ${time}.` : "Saved. Daily email is off.",
          }),
        onError: (err) => toast.push({ message: `Could not save: ${err.message}` }),
      },
    );
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/digest/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; to?: string; count?: number };
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setTestResult({
        ok: true,
        message: `Sent to ${body.to}. It lists ${body.count ?? 0} task${body.count === 1 ? "" : "s"} due today or overdue. Check your inbox (and spam).`,
      });
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-300">
          <Mail size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p id="digest-label" className="font-semibold">
            Daily email digest
          </p>
          <p id="digest-help" className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Every morning we email everything due today or overdue, with the highest priority first. If nothing is
            pending, no email is sent.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="digest-label"
          aria-describedby="digest-help"
          onClick={() => setEnabled((v) => !v)}
          className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
            enabled ? "bg-indigo-600" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <fieldset disabled={!enabled} className={`space-y-3 ${enabled ? "" : "opacity-50"}`}>
        <legend className="mb-1 text-sm font-medium">What time should it arrive?</legend>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick times">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={time === p.value}
              onClick={() => setTime(p.value)}
              className="min-h-10 rounded-full border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-100 aria-pressed:border-indigo-600 aria-pressed:bg-indigo-600/10 aria-pressed:text-indigo-700 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:aria-pressed:border-indigo-400 dark:aria-pressed:text-indigo-300"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="digest-time" className="text-sm font-medium">
            Or pick any time
          </label>
          <input
            id="digest-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="min-h-11 rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Your timezone: <strong>{timezone}</strong>. The email arrives within about 15 minutes of this time.
        </p>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!dirty || save.isPending}
          className="min-h-11 rounded-xl bg-indigo-600 px-6 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={sendTest}
          disabled={testing}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 px-4 font-semibold hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <Send size={16} aria-hidden="true" />
          {testing ? "Sending…" : "Send me a test email now"}
        </button>
      </div>

      {testResult && (
        <p
          role={testResult.ok ? "status" : "alert"}
          className={`rounded-xl p-3 text-sm ${
            testResult.ok
              ? "bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {testResult.message}
        </p>
      )}
    </form>
  );
}

export function NotificationSettings() {
  const { data, isLoading, isError, error } = useProfile();
  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />;
  if (isError) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
        Couldn&apos;t load settings{error instanceof Error ? `: ${error.message}` : ""}.
      </p>
    );
  }
  // Keyed on the saved values so the form re-syncs after a save.
  return (
    <Form
      key={`${data!.email_digest_enabled}|${data!.email_digest_time}|${data!.timezone}`}
      profile={data!}
    />
  );
}
