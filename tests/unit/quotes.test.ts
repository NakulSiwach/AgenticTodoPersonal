import { describe, expect, it } from "vitest";
import { QUOTES, quoteForDate } from "@/lib/quotes";
import { addDays } from "@/lib/dates";

describe("QUOTES", () => {
  it("has a healthy collection with text and author on every entry", () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(80);
    for (const q of QUOTES) {
      expect(q.text.trim().length).toBeGreaterThan(5);
      expect(q.author.trim().length).toBeGreaterThan(1);
    }
  });
  it("has no duplicates", () => {
    const texts = QUOTES.map((q) => q.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("quoteForDate", () => {
  it("is stable for a date", () => {
    expect(quoteForDate("2026-10-20")).toEqual(quoteForDate("2026-10-20"));
  });
  it("visits every quote once before repeating", () => {
    const seen = new Set<string>();
    for (let i = 0; i < QUOTES.length; i++) seen.add(quoteForDate(addDays("2026-01-01", i)).text);
    expect(seen.size).toBe(QUOTES.length);
  });
  it("doesn't show the same author on consecutive days for a month", () => {
    let repeats = 0;
    for (let i = 1; i < 31; i++) {
      const a = quoteForDate(addDays("2026-10-01", i - 1)).author;
      const b = quoteForDate(addDays("2026-10-01", i)).author;
      if (a === b) repeats++;
    }
    expect(repeats).toBeLessThanOrEqual(2);
  });
  it("works for any list length (stride stays co-prime)", () => {
    const small = QUOTES.slice(0, 37);
    const seen = new Set<string>();
    for (let i = 0; i < small.length; i++) seen.add(quoteForDate(addDays("2026-01-01", i), small).text);
    expect(seen.size).toBe(small.length);
  });
});
