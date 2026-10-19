"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Dropdown, type DropdownOption } from "./Dropdown";
import { ThemeToggle } from "./ThemeToggle";

const OPTIONS: DropdownOption<string>[] = [
  { value: "/", label: "My tasks" },
  { value: "/profile", label: "Profile & settings" },
  { value: "signout", label: "Sign out" },
];

/** Avatar button with a small menu: tasks, profile, sign out. */
export function ProfileMenu({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  const onChoose = async (value: string) => {
    if (value === "signout") {
      await createClient().auth.signOut();
      qc.clear();
      router.replace("/login");
      router.refresh();
      return;
    }
    if (value !== pathname) router.push(value);
  };

  const initial = (email.trim()[0] ?? "?").toUpperCase();

  return (
    <Dropdown
      label="Profile menu"
      title={email}
      alignRight
      value={pathname === "/profile" ? "/profile" : "/"}
      options={OPTIONS}
      onChange={onChoose}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700"
    >
      {initial}
    </Dropdown>
  );
}

/** Night-mode toggle + profile avatar, placed at the top right of every screen. */
export function TopActions({ email }: { email: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <ThemeToggle />
      <ProfileMenu email={email} />
    </div>
  );
}
