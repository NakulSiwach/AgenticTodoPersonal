import { HIGHLIGHT_COLORS, TEXT_SWATCHES } from "@/lib/palette";
import {
  HIGHLIGHT_COLOR_KEYS,
  TEXT_COLOR_KEYS,
  type HighlightKey,
  type TextColorKey,
} from "@/lib/types";

type Props =
  | {
      kind: "text";
      value: TextColorKey | null;
      onChange: (v: TextColorKey | null) => void;
      disabledKeys?: readonly string[];
    }
  | {
      kind: "highlight";
      value: HighlightKey | null;
      onChange: (v: HighlightKey | null) => void;
      disabledKeys?: readonly string[];
    };

export function ColorPicker(props: Props) {
  const { kind, disabledKeys = [] } = props;
  const keys: readonly string[] = kind === "text" ? TEXT_COLOR_KEYS : HIGHLIGHT_COLOR_KEYS;
  const noneLabel = kind === "text" ? "Default" : "None";
  const group = kind === "text" ? "Text color" : "Highlight color";

  const select = (key: string | null) => {
    if (props.kind === "text") props.onChange(key as TextColorKey | null);
    else props.onChange(key as HighlightKey | null);
  };

  const ring = "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900";

  return (
    <div role="radiogroup" aria-label={group} className="flex flex-wrap gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={props.value === null}
        onClick={() => select(null)}
        className={`min-h-11 rounded-full border border-neutral-300 px-3 text-sm dark:border-neutral-600 ${
          props.value === null ? ring : ""
        }`}
      >
        {noneLabel}
      </button>
      {keys.map((key) => {
        const disabled = disabledKeys.includes(key);
        const swatch =
          kind === "text" ? TEXT_SWATCHES[key as TextColorKey] : HIGHLIGHT_COLORS[key as HighlightKey];
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={props.value === key}
            aria-label={`${group}: ${key}${disabled ? " (unreadable with current choice)" : ""}`}
            disabled={disabled}
            onClick={() => select(key)}
            className={`grid size-11 place-items-center rounded-full border border-black/10 disabled:opacity-25 dark:border-white/20 ${swatch} ${
              props.value === key ? ring : ""
            }`}
          >
            {props.value === key && <span className="text-xs font-bold text-black/70 dark:text-white">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
