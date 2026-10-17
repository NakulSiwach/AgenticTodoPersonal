import type { HighlightKey, Priority, TextColorKey } from "./types";

// Class names must be complete literals so Tailwind can see them at build time.
export const TEXT_COLORS: Record<TextColorKey, string> = {
  red: "text-red-700 dark:text-red-300",
  orange: "text-orange-700 dark:text-orange-300",
  amber: "text-amber-800 dark:text-amber-300",
  green: "text-green-700 dark:text-green-300",
  teal: "text-teal-700 dark:text-teal-300",
  blue: "text-blue-700 dark:text-blue-300",
  purple: "text-purple-700 dark:text-purple-300",
  pink: "text-pink-700 dark:text-pink-300",
};

export const TEXT_SWATCHES: Record<TextColorKey, string> = {
  red: "bg-red-600",
  orange: "bg-orange-600",
  amber: "bg-amber-600",
  green: "bg-green-600",
  teal: "bg-teal-600",
  blue: "bg-blue-600",
  purple: "bg-purple-600",
  pink: "bg-pink-600",
};

export const HIGHLIGHT_COLORS: Record<HighlightKey, string> = {
  yellow: "bg-yellow-200 dark:bg-yellow-500/30",
  green: "bg-green-200 dark:bg-green-500/30",
  blue: "bg-blue-200 dark:bg-blue-500/30",
  pink: "bg-pink-200 dark:bg-pink-500/30",
  orange: "bg-orange-200 dark:bg-orange-500/30",
  purple: "bg-purple-200 dark:bg-purple-500/30",
};

export const PRIORITY_STYLES: Record<Priority, { label: string; cls: string }> = {
  0: { label: "P0", cls: "bg-red-600 text-white" },
  1: { label: "P1", cls: "bg-orange-500 text-white" },
  2: { label: "P2", cls: "bg-amber-400 text-black" },
  3: { label: "P3", cls: "bg-blue-500 text-white" },
  4: { label: "P4", cls: "bg-gray-400 text-black" },
};

// Representative hex values used only for WCAG contrast checks (mirror the classes above).
const LIGHT_BG = "#ffffff";
const DARK_BG = "#0a0a0a";
const LIGHT_DEFAULT_TEXT = "#171717";
const DARK_DEFAULT_TEXT = "#ededed";

const TEXT_HEX: Record<TextColorKey, { light: string; dark: string }> = {
  red: { light: "#b91c1c", dark: "#fca5a5" },
  orange: { light: "#c2410c", dark: "#fdba74" },
  amber: { light: "#92400e", dark: "#fcd34d" },
  green: { light: "#15803d", dark: "#86efac" },
  teal: { light: "#0f766e", dark: "#5eead4" },
  blue: { light: "#1d4ed8", dark: "#93c5fd" },
  purple: { light: "#7e22ce", dark: "#d8b4fe" },
  pink: { light: "#be185d", dark: "#f9a8d4" },
};

const HIGHLIGHT_HEX: Record<HighlightKey, { light: string; dark: string }> = {
  yellow: { light: "#fef08a", dark: "#eab308" },
  green: { light: "#bbf7d0", dark: "#22c55e" },
  blue: { light: "#bfdbfe", dark: "#3b82f6" },
  pink: { light: "#fbcfe8", dark: "#ec4899" },
  orange: { light: "#fed7aa", dark: "#f97316" },
  purple: { light: "#e9d5ff", dark: "#a855f7" },
};

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function blend(fg: [number, number, number], bg: [number, number, number], alpha: number) {
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as [number, number, number];
}

export const MIN_CONTRAST = 4.5;

/** True when the text color is readable on the highlight in both light and dark themes. */
export function isReadable(text: TextColorKey | null, highlight: HighlightKey | null): boolean {
  if (!highlight) return true;
  const lightText = toRgb(text ? TEXT_HEX[text].light : LIGHT_DEFAULT_TEXT);
  const darkText = toRgb(text ? TEXT_HEX[text].dark : DARK_DEFAULT_TEXT);
  const lightBg = blend(toRgb(HIGHLIGHT_HEX[highlight].light), toRgb(LIGHT_BG), 1);
  const darkBg = blend(toRgb(HIGHLIGHT_HEX[highlight].dark), toRgb(DARK_BG), 0.3);
  return (
    contrastRatio(lightText, lightBg) >= MIN_CONTRAST &&
    contrastRatio(darkText, darkBg) >= MIN_CONTRAST
  );
}

/** Checkbox outline per priority, so urgency is visible at a glance (Todoist-style). */
export const PRIORITY_RING: Record<Priority, string> = {
  0: "border-red-500",
  1: "border-orange-500",
  2: "border-amber-500",
  3: "border-blue-500",
  4: "border-neutral-400",
};

export const PRIORITY_DOT: Record<Priority, string> = {
  0: "bg-red-600",
  1: "bg-orange-500",
  2: "bg-amber-400",
  3: "bg-blue-500",
  4: "bg-gray-400",
};

export const PRIORITY_HINTS: Record<Priority, string> = {
  0: "Urgent",
  1: "High",
  2: "Medium",
  3: "Low",
  4: "Lowest",
};
