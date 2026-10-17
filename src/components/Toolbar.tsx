import { forwardRef } from "react";
import { ArrowUpDown, ChevronDown, Flag, Menu, Search, X } from "lucide-react";
import { priorityOptions } from "@/lib/options";
import type { PriorityFilter, SortKey } from "@/lib/types";
import { Dropdown, type DropdownOption } from "./Dropdown";

type Props = {
  title: string;
  subtitle: string;
  progress: { done: number; total: number } | null;
  search: string;
  sort: SortKey;
  priority: PriorityFilter;
  onSearch: (q: string) => void;
  onSort: (s: SortKey) => void;
  onPriority: (p: PriorityFilter) => void;
  onMenu: () => void;
};

const SORTS: DropdownOption<SortKey>[] = [
  { value: "smart", label: "Smart (by date)" },
  { value: "due", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "newest", label: "Newest first" },
  { value: "alpha", label: "A to Z" },
];

const PRIORITY_FILTERS: DropdownOption<PriorityFilter>[] = [
  { value: "all", label: "Any priority" },
  ...priorityOptions,
];

const trigger =
  "inline-flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm hover:bg-neutral-50 sm:flex-none sm:min-w-40 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800";

export const Toolbar = forwardRef<HTMLInputElement, Props>(function Toolbar(
  { title, subtitle, progress, search, sort, priority, onSearch, onSort, onPriority, onMenu },
  searchRef,
) {
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <>
      {/* Only the title bar stays pinned; the search/sort row scrolls away to save phone screen space. */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-[var(--background)]/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur dark:border-neutral-800">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMenu}
              aria-label="Open menu"
              className="-ml-2 grid size-11 shrink-0 place-items-center rounded-xl hover:bg-neutral-200/70 md:hidden dark:hover:bg-neutral-800"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold">{title}</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
                {subtitle}
              </p>
            </div>
          </div>
          {progress && progress.total > 0 && (
            <div
              role="progressbar"
              aria-label="Today's progress"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
            >
              <div
                className="h-full rounded-full bg-indigo-600 transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </header>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 pt-3">
        <div className="relative min-w-0 basis-full sm:basis-0 sm:flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          />
          <label htmlFor="search" className="sr-only">
            Search tasks
          </label>
          <input
            id="search"
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search tasks…  ( / )"
            className="min-h-10 w-full rounded-xl border border-neutral-300 bg-white pr-9 pl-9 text-sm [&::-webkit-search-cancel-button]:hidden dark:border-neutral-700 dark:bg-neutral-900"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <Dropdown
          label="Sort by"
          title="Sort by"
          value={sort}
          options={SORTS}
          onChange={onSort}
          className={trigger}
        >
          <ArrowUpDown size={15} aria-hidden="true" className="shrink-0 text-neutral-500" />
          <span className="min-w-0 flex-1 truncate text-left">{SORTS.find((x) => x.value === sort)?.label}</span>
          <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-neutral-500" />
        </Dropdown>
        <Dropdown
          label="Filter by priority"
          title="Show priority"
          alignRight
          value={priority}
          options={PRIORITY_FILTERS}
          onChange={onPriority}
          className={trigger}
        >
          <Flag size={15} aria-hidden="true" className="shrink-0 text-neutral-500" />
          <span className="min-w-0 flex-1 truncate text-left">
            {PRIORITY_FILTERS.find((x) => x.value === priority)?.label}
          </span>
          <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-neutral-500" />
        </Dropdown>
      </div>
    </>
  );
});
