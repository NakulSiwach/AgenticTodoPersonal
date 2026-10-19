"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export const PROFILE_KEY = ["profile"] as const;

export const DEFAULT_PROFILE: Profile = {
  display_name: null,
  digest_quote_enabled: true,
  email_digest_enabled: false,
  email_digest_time: "08:00",
  timezone: "UTC",
};

export const profilePatchSchema = z
  .object({
    display_name: z.string().trim().min(1, "Name can't be empty").max(60, "Name is too long").nullable(),
    email_digest_enabled: z.boolean(),
    digest_quote_enabled: z.boolean(),
    email_digest_time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a valid time"),
    timezone: z.string().min(1).max(64),
  })
  .partial();

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function fail(message: string): never {
  if (/schema cache|does not exist/i.test(message)) {
    throw new Error(
      "Database needs the latest update: run the newest files in supabase/migrations (0003 and later) in the Supabase SQL editor",
    );
  }
  throw new Error(message);
}

type Row = Partial<Profile> & { email_digest_time?: string };

function normalize(row: Row | null): Profile {
  if (!row) return DEFAULT_PROFILE;
  return {
    display_name: row.display_name ?? null,
    digest_quote_enabled: row.digest_quote_enabled ?? true,
    email_digest_enabled: row.email_digest_enabled ?? false,
    // Postgres returns "08:00:00"; the UI works with "08:00".
    email_digest_time: (row.email_digest_time ?? "08:00").slice(0, 5),
    timezone: row.timezone ?? "UTC",
  };
}

export async function getProfile(): Promise<Profile> {
  const { data, error } = await createClient().from("profiles").select("*").maybeSingle();
  if (error) fail(error.message);
  return normalize(data);
}

export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const parsed = profilePatchSchema.parse(patch);
  const { data, error } = await createClient()
    .from("profiles")
    .upsert(parsed, { onConflict: "user_id" })
    .select()
    .single();
  if (error) fail(error.message);
  return normalize(data);
}

export function useProfile() {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: getProfile, staleTime: 60_000 });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveProfile,
    onSuccess: (profile) => qc.setQueryData(PROFILE_KEY, profile),
  });
}
