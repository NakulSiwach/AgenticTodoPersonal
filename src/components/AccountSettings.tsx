"use client";

import { useState } from "react";
import { useProfile, useSaveProfile } from "@/lib/profile";
import { useToast } from "./Toast";

function Form({ email, name }: { email: string; name: string }) {
  const save = useSaveProfile();
  const toast = useToast();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length > 60) return setError("Name is too long (max 60)");
    setError(null);
    save.mutate(
      { display_name: trimmed === "" ? null : trimmed },
      {
        onSuccess: () => toast.push({ message: "Profile saved" }),
        onError: (err) => toast.push({ message: `Could not save: ${err.message}` }),
      },
    );
  };

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div>
        <label htmlFor="profile-email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="profile-email"
          value={email}
          readOnly
          className="min-h-11 w-full rounded-xl border border-neutral-200 bg-neutral-100 px-3 text-base text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          This is the address your daily email is sent to.
        </p>
      </div>
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
          Display name
        </label>
        <input
          id="profile-name"
          value={value}
          maxLength={61}
          placeholder="What should we call you?"
          onChange={(e) => setValue(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-950"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Used in the greeting of your email.</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={save.isPending || value.trim() === name}
        className="min-h-11 rounded-xl bg-indigo-600 px-6 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function AccountSettings({ email }: { email: string }) {
  const { data, isLoading } = useProfile();
  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />;
  return <Form key={data?.display_name ?? ""} email={email} name={data?.display_name ?? ""} />;
}
