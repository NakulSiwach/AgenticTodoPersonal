import { z } from "zod";
import { HIGHLIGHT_COLOR_KEYS, REPEATS, TEXT_COLOR_KEYS } from "./types";

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

export const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .nullable();
export const listNameSchema = z.string().trim().min(1).max(40, "List name is too long").nullable();
export const tagSchema = z.string().trim().min(1).max(30, "Tag is too long");
export const tagsSchema = z.array(tagSchema).max(10, "At most 10 tags");
export const repeatSchema = z.enum(REPEATS).nullable();
export const sortOrderSchema = z.number().finite().nullable();
export const subtasksSchema = z
  .array(z.object({ id: z.string().min(1), title: titleSchema, done: z.boolean() }))
  .max(50, "At most 50 subtasks");

export const newTodoSchema = z.object({
  id: z.string().uuid(),
  title: titleSchema,
  priority: prioritySchema,
  notes: notesSchema.optional(),
  text_color: textColorSchema.optional(),
  highlight_color: highlightSchema.optional(),
  due_date: dueDateSchema.optional(),
  list_name: listNameSchema.optional(),
  tags: tagsSchema.optional(),
  subtasks: subtasksSchema.optional(),
  repeat: repeatSchema.optional(),
});

export const todoPatchSchema = z
  .object({
    title: titleSchema,
    notes: notesSchema,
    priority: prioritySchema,
    completed: z.boolean(),
    text_color: textColorSchema,
    highlight_color: highlightSchema,
    due_date: dueDateSchema,
    list_name: listNameSchema,
    tags: tagsSchema,
    subtasks: subtasksSchema,
    repeat: repeatSchema,
    sort_order: sortOrderSchema,
  })
  .partial();
