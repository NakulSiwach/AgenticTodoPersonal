import { PRIORITIES, type Priority } from "@/lib/types";
import { PRIORITY_STYLES } from "@/lib/palette";

type Props = {
  priority: Priority;
  /** When given, tapping the badge opens a native priority menu. */
  onChange?: (p: Priority) => void;
  label?: string;
};

export function PriorityBadge({ priority, onChange, label }: Props) {
  const { label: text, cls } = PRIORITY_STYLES[priority];
  return (
    <span
      className={`relative inline-flex h-8 min-w-11 items-center justify-center rounded-full px-3 text-xs font-bold ${cls}`}
    >
      {text}
      {onChange && (
        <select
          aria-label={label ?? "Change priority"}
          value={priority}
          onChange={(e) => onChange(Number(e.target.value) as Priority)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_STYLES[p].label}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}
