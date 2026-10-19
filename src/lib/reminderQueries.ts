"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { deleteReminder, listReminders, saveReminder } from "@/lib/reminderApi";
import { cleanReminder, type Reminder, type ReminderInput } from "@/lib/reminders";

export const REMINDERS_KEY = ["reminders"] as const;
export function useReminders() {
  return useQuery({ queryKey: REMINDERS_KEY, queryFn: listReminders, retry: false });
}

function toRow(input: ReminderInput, existing?: Reminder): Reminder {
  const now = new Date().toISOString();
  return {
    user_id: existing?.user_id ?? "",
    created_at: existing?.created_at ?? now,
    updated_at: now,
    ...cleanReminder(input),
  };
}

// Same shape as the task hooks in queries.ts: apply the change to the cache synchronously in the
// handler, then save; on failure put the old list back and say why.
export function useSaveReminder() {
  const qc = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: ({ input }: { input: ReminderInput; prev: Reminder[] | undefined }) => saveReminder(input),
    onSuccess: (saved) =>
      qc.setQueryData<Reminder[]>(REMINDERS_KEY, (list) =>
        (list ?? []).map((r) => (r.id === saved.id ? saved : r)),
      ),
    onError: (err, { prev }) => {
      qc.setQueryData(REMINDERS_KEY, prev);
      toast.push({ message: `Could not save reminder: ${err.message}` });
    },
  });
  const { mutate: run } = mutation;
  const save = useCallback(
    (input: ReminderInput) => {
      const prev = qc.getQueryData<Reminder[]>(REMINDERS_KEY);
      qc.setQueryData<Reminder[]>(REMINDERS_KEY, (list = []) => {
        const existing = list.find((r) => r.id === input.id);
        const row = toRow(input, existing);
        return existing ? list.map((r) => (r.id === input.id ? row : r)) : [...list, row];
      });
      run({ input, prev });
    },
    [qc, run],
  );
  return { ...mutation, save };
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: ({ id }: { id: string; prev: Reminder[] | undefined }) => deleteReminder(id),
    onError: (err, { prev }) => {
      qc.setQueryData(REMINDERS_KEY, prev);
      toast.push({ message: `Could not delete reminder: ${err.message}` });
    },
  });
  const { mutate: run } = mutation;
  const remove = useCallback(
    (id: string) => {
      const prev = qc.getQueryData<Reminder[]>(REMINDERS_KEY);
      qc.setQueryData<Reminder[]>(REMINDERS_KEY, (list = []) => list.filter((r) => r.id !== id));
      run({ id, prev });
    },
    [qc, run],
  );
  return { ...mutation, remove };
}
