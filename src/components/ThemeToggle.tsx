"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, readTheme, subscribeTheme, type ThemeChoice } from "@/lib/theme";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const META = {
  system: { Icon: Monitor, label: "System theme" },
  light: { Icon: Sun, label: "Light theme" },
  dark: { Icon: Moon, label: "Dark theme" },
} as const;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeTheme, readTheme, (): ThemeChoice => "system");

  const { Icon, label } = META[choice];
  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      title={`${label} (click for ${META[next].label.toLowerCase()})`}
      aria-label={`${label}. Switch to ${META[next].label.toLowerCase()}`}
      className={`grid size-11 place-items-center rounded-xl text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800 ${className}`}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
