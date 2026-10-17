import { PRIORITIES, type PriorityFilter, type StatusFilter } from "@/lib/types";

type Props = {
  status: StatusFilter;
  priority: PriorityFilter;
  onStatus: (s: StatusFilter) => void;
  onPriority: (p: PriorityFilter) => void;
};

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({ status, priority, onStatus, onPriority }: Props) {
  return (
    <div className="space-y-1">
      <div role="group" aria-label="Status filter" className="flex gap-2 overflow-x-auto py-1">
        {STATUSES.map((s) => (
          <Chip key={s.value} active={status === s.value} onClick={() => onStatus(s.value)}>
            {s.label}
          </Chip>
        ))}
      </div>
      <div role="group" aria-label="Priority filter" className="flex gap-2 overflow-x-auto py-1">
        <Chip active={priority === "all"} onClick={() => onPriority("all")}>
          Any priority
        </Chip>
        {PRIORITIES.map((p) => (
          <Chip key={p} active={priority === p} onClick={() => onPriority(p)}>
            P{p}
          </Chip>
        ))}
      </div>
    </div>
  );
}
