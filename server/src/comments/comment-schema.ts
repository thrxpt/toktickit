import { z } from "zod";

// BR-27: Comment and note text must be trimmed of whitespace, required, and
// bounded between 1 and 2,000 characters. Whitespace-only submissions are rejected.
export const commentContentSchema = z
  .string({ message: "Content is required." })
  .trim()
  .min(1, { message: "Content must be between 1 and 2,000 characters." })
  .max(2000, { message: "Content must not exceed 2,000 characters." });

export const createCommentSchema = z
  .object({
    content: commentContentSchema,
  })
  .strict();

export const createInternalNoteSchema = z
  .object({
    content: commentContentSchema,
  })
  .strict();

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateInternalNoteInput = z.infer<typeof createInternalNoteSchema>;
