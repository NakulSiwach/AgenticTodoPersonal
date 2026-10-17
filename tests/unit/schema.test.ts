import { describe, expect, it } from "vitest";
import { newTodoSchema, todoPatchSchema } from "@/lib/schema";

describe("newTodoSchema", () => {
  it("accepts a valid todo and trims the title", () => {
    const r = newTodoSchema.parse({ title: "  Buy milk ", priority: 2 });
    expect(r.title).toBe("Buy milk");
  });
  it("rejects empty and whitespace titles", () => {
    expect(newTodoSchema.safeParse({ title: "", priority: 2 }).success).toBe(false);
    expect(newTodoSchema.safeParse({ title: "   ", priority: 2 }).success).toBe(false);
  });
  it("rejects a 201 character title but accepts 200", () => {
    expect(newTodoSchema.safeParse({ title: "a".repeat(201), priority: 2 }).success).toBe(false);
    expect(newTodoSchema.safeParse({ title: "a".repeat(200), priority: 2 }).success).toBe(true);
  });
  it("rejects out-of-range priority", () => {
    expect(newTodoSchema.safeParse({ title: "x", priority: 5 }).success).toBe(false);
    expect(newTodoSchema.safeParse({ title: "x", priority: -1 }).success).toBe(false);
  });
  it("rejects unknown color keys", () => {
    expect(newTodoSchema.safeParse({ title: "x", priority: 1, text_color: "neon" }).success).toBe(false);
    expect(newTodoSchema.safeParse({ title: "x", priority: 1, highlight_color: "red" }).success).toBe(false);
  });
});

describe("todoPatchSchema", () => {
  it("allows partial updates", () => {
    expect(todoPatchSchema.parse({ completed: true })).toEqual({ completed: true });
  });
  it("allows clearing colors with null", () => {
    expect(todoPatchSchema.parse({ text_color: null, highlight_color: null })).toEqual({
      text_color: null,
      highlight_color: null,
    });
  });
  it("rejects notes over 2000 chars", () => {
    expect(todoPatchSchema.safeParse({ notes: "n".repeat(2001) }).success).toBe(false);
  });
});
