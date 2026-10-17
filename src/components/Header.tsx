"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function Header({ email }: { email: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const signOut = async () => {
    await createClient().auth.signOut();
    qc.clear();
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
      <div>
        <h1 className="text-xl font-bold">TaskFlow</h1>
        <p className="max-w-[14rem] truncate text-xs text-neutral-500 dark:text-neutral-400">{email}</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <LogOut size={18} aria-hidden="true" />
        Sign out
      </button>
    </header>
  );
}
