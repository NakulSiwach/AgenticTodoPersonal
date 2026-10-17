"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

export type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
  /** Small secondary text, e.g. "Urgent". */
  hint?: string;
  /** Tailwind background class for a colour dot, e.g. `bg-red-600`. */
  dot?: string;
};

type Props<T extends string | number> = {
  /** Accessible name of the trigger button (e.g. "Priority"). */
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /** What the trigger button shows. */
  children: React.ReactNode;
  className?: string;
  /** Align the menu to the trigger's right edge instead of its left. */
  alignRight?: boolean;
  /** Optional small title shown at the top of the menu. */
  title?: string;
};

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

const MENU_MIN_WIDTH = 190;
const GAP = 6;

/**
 * A styled replacement for the native <select>. The menu is rendered in a portal with fixed
 * positioning so it is never clipped by scrolling rows or the blurred add bar, and it flips
 * upwards when there is more room above (e.g. the add bar at the bottom of a phone screen).
 */
export function Dropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
  children,
  className = "",
  alignRight = false,
  title,
}: Props<T>) {
  const [pos, setPos] = useState<Position | null>(null);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = pos !== null;

  const openMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, MENU_MIN_WIDTH);
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const up = below < 240 && above > below;
    const rawLeft = alignRight ? r.right - width : r.left;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setPos({
      left: Math.min(Math.max(8, rawLeft), window.innerWidth - width - 8),
      width,
      maxHeight: Math.min(340, up ? above : below),
      ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    });
  };

  const close = (restoreFocus = true) => {
    setPos(null);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const choose = (v: T) => {
    onChange(v);
    close();
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus({ preventScroll: true });
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setPos(null);
    };
    const onMove = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      setPos(null);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        // Don't let Escape also close a sheet this menu was opened from.
        e.stopPropagation();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[active]) choose(options[active].value);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={className}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={id}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onMenuKey}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
            className="anim-fade z-[70] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl outline-none dark:border-neutral-700 dark:bg-neutral-900"
          >
            {title && (
              <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                {title}
              </p>
            )}
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <div
                  key={String(o.value)}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={selected}
                  aria-label={o.label}
                  onClick={() => choose(o.value)}
                  onMouseMove={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm ${
                    i === active ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  } ${selected ? "font-semibold" : ""}`}
                >
                  {o.dot && <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${o.dot}`} />}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && (
                    <span aria-hidden="true" className="text-xs text-neutral-500 dark:text-neutral-400">
                      {o.hint}
                    </span>
                  )}
                  {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-indigo-600 dark:text-indigo-400" />}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
