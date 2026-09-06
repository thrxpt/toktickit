import { z } from "zod";

// Soft removal reason validation schema (BR-19, BR-22, BR-42).
// Must be required, trimmed, 1–200 characters.
export const removeAttachmentSchema = z.object({
  reason: z
    .string({ message: "Removal reason is required." })
    .trim()
    .min(1, { message: "Removal reason must not be blank." })
    .max(200, { message: "Removal reason must be 200 characters or fewer." }),
});

export type RemoveAttachmentInput = z.infer<typeof removeAttachmentSchema>;
