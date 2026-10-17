export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "theme";

/** Runs before first paint (see layout.tsx) so there is no light/dark flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const listeners = new Set<() => void>();

/** For useSyncExternalStore: re-render when the choice or the system setting changes. */
export function subscribeTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (readTheme() === "system") applyTheme("system");
  };
  mq.addEventListener("change", onSystem);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", onSystem);
  };
}

export function applyTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* private mode: the choice just won't persist */
  }
  const dark =
    choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  listeners.forEach((l) => l());
}
