import type { DropdownOption } from "@/components/Dropdown";
import { PRIORITY_DOT, PRIORITY_HINTS, PRIORITY_STYLES } from "./palette";
import { PRIORITIES, type Priority } from "./types";

export const priorityOptions: DropdownOption<Priority>[] = PRIORITIES.map((p) => ({
  value: p,
  label: PRIORITY_STYLES[p].label,
  hint: PRIORITY_HINTS[p],
  dot: PRIORITY_DOT[p],
}));

/** Tags offered as one-tap chips; users can still type any tag. */
export const QUICK_TAGS = ["Office", "Personal", "Shopping", "Health", "Home"] as const;
