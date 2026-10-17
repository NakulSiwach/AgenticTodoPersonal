import { type Priority } from "@/lib/types";
import { priorityOptions } from "@/lib/options";
import { PRIORITY_STYLES } from "@/lib/palette";
import { Dropdown } from "./Dropdown";

type Props = {
  priority: Priority;
  /** When given, tapping the badge opens the priority menu. */
  onChange?: (p: Priority) => void;
  label?: string;
};

const base = "inline-flex h-8 min-w-11 items-center justify-center rounded-full px-3 text-xs font-bold";

export function PriorityBadge({ priority, onChange, label }: Props) {
  const { label: text, cls } = PRIORITY_STYLES[priority];
  if (!onChange) return <span className={`${base} ${cls}`}>{text}</span>;
  return (
    <Dropdown
      label={label ?? "Change priority"}
      title="Priority"
      alignRight
      value={priority}
      options={priorityOptions}
      onChange={onChange}
      className={`${base} ${cls} cursor-pointer transition hover:brightness-110 active:scale-95`}
    >
      {text}
    </Dropdown>
  );
}
