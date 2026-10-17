import { PRIORITIES, type Priority } from "@/lib/types";
import { PRIORITY_STYLES } from "@/lib/palette";

type Props = { value: Priority; onChange: (p: Priority) => void };

export function PriorityPicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Priority" className="flex gap-2">
      {PRIORITIES.map((p) => {
        const selected = p === value;
        const { label, cls } = PRIORITY_STYLES[p];
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p)}
            className={`min-h-11 min-w-11 flex-1 rounded-xl text-sm font-bold transition ${
              selected
                ? `${cls} ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900`
                : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
