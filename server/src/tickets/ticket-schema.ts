import { z } from "zod";

// Zod schema for POST /api/tickets (BR-14, BR-16, BR-17, BR-19, BR-20, BR-21).
// Trimming happens via .trim() before length checks, so whitespace-only fails required.
// There is no server default for requestedPriority (BR-14).
export const createTicketSchema = z.object({
  summary: z
    .string({ message: "Summary is required." })
    .trim()
    .min(5, { message: "Summary must be at least 5 characters." })
    .max(150, { message: "Summary must not exceed 150 characters." }),
  description: z
    .string({ message: "Description is required." })
    .trim()
    .min(10, { message: "Description must be at least 10 characters." })
    .max(4000, { message: "Description must not exceed 4000 characters." }),
  categoryId: z
    .number({ message: "Category is required." })
    .int({ message: "Category is required." })
    .positive({ message: "Category is required." }),
  relatedSystemId: z
    .number({ message: "Related system is required." })
    .int({ message: "Related system is required." })
    .positive({ message: "Related system is required." }),
  requestedPriority: z.enum(["LOW", "MEDIUM", "HIGH"] as const, {
    message: "Requested priority must be LOW, MEDIUM, or HIGH.",
  }),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export function formatZodFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}
