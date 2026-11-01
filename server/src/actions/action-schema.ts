import { z } from "zod";
import { expectedVersionSchema } from "../tickets/ticket-version";

const fields = {
  description: z.string().trim().min(1).max(2000),
  result: z.string().trim().min(1).max(2000),
  followUpRequired: z.boolean().optional(),
  followUpNote: z.string().trim().max(2000).nullable().optional(),
  attachmentNotes: z.string().trim().max(1000).nullable().optional(),
  expectedVersion: expectedVersionSchema,
};
// PATCH merges optional fields with stored values before checking BR-04.
export const updateActionSchema = z.strictObject(fields);
export const createActionSchema = updateActionSchema.superRefine((value, ctx) => {
  if (!validFollowUp(value.followUpRequired ?? false, value.followUpNote)) {
    ctx.addIssue({ code: "custom", path: ["followUpNote"], message: "Supply a follow-up note exactly when follow-up is required." });
  }
});
export function validFollowUp(required: boolean, note: string | null | undefined): boolean {
  return required ? Boolean(note?.trim()) : !note?.trim();
}
