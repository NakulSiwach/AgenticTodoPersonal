import { z } from "zod";
import { HIGHLIGHT_COLOR_KEYS, TEXT_COLOR_KEYS } from "./types";

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or fewer");

export const notesSchema = z
  .string()
  .max(2000, "Notes must be 2000 characters or fewer")
  .nullable();

export const prioritySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const textColorSchema = z.enum(TEXT_COLOR_KEYS).nullable();
export const highlightSchema = z.enum(HIGHLIGHT_COLOR_KEYS).nullable();

export const newTodoSchema = z.object({
  title: titleSchema,
  priority: prioritySchema,
  notes: notesSchema.optional(),
  text_color: textColorSchema.optional(),
  highlight_color: highlightSchema.optional(),
});

export const todoPatchSchema = z
  .object({
    title: titleSchema,
    notes: notesSchema,
    priority: prioritySchema,
    completed: z.boolean(),
    text_color: textColorSchema,
    highlight_color: highlightSchema,
  })
  .partial();
