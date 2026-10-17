import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  HIGHLIGHT_COLORS,
  isReadable,
  PRIORITY_STYLES,
  TEXT_COLORS,
  TEXT_SWATCHES,
} from "@/lib/palette";
import { HIGHLIGHT_COLOR_KEYS, PRIORITIES, TEXT_COLOR_KEYS } from "@/lib/types";

describe("palette coverage", () => {
  it("has a class for every text color key", () => {
    for (const k of TEXT_COLOR_KEYS) {
      expect(TEXT_COLORS[k]).toMatch(/^text-/);
      expect(TEXT_SWATCHES[k]).toMatch(/^bg-/);
    }
  });
  it("has a class for every highlight key", () => {
    for (const k of HIGHLIGHT_COLOR_KEYS) expect(HIGHLIGHT_COLORS[k]).toMatch(/^bg-/);
  });
  it("labels every priority P0..P4", () => {
    expect(PRIORITIES.map((p) => PRIORITY_STYLES[p].label)).toEqual(["P0", "P1", "P2", "P3", "P4"]);
  });
});

describe("contrast", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
  });
  it("default text is readable on every highlight", () => {
    for (const h of HIGHLIGHT_COLOR_KEYS) expect(isReadable(null, h)).toBe(true);
  });
  it("no highlight is always readable", () => {
    for (const t of TEXT_COLOR_KEYS) expect(isReadable(t, null)).toBe(true);
  });
  it("flags at least one genuinely unreadable combination", () => {
    const bad = TEXT_COLOR_KEYS.flatMap((t) =>
      HIGHLIGHT_COLOR_KEYS.filter((h) => !isReadable(t, h)).map((h) => `${t}/${h}`),
    );
    expect(bad.length).toBeGreaterThan(0);
  });
  it("leaves plenty of readable combinations offered", () => {
    const ok = TEXT_COLOR_KEYS.flatMap((t) => HIGHLIGHT_COLOR_KEYS.filter((h) => isReadable(t, h)));
    expect(ok.length).toBeGreaterThanOrEqual(20);
  });
});
