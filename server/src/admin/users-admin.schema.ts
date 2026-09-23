import { z } from "zod";

/**
 * Validation schema for GET /api/admin/users query parameters (AC-16, FR-15).
 */
export const adminUserQuerySchema = z
  .object({
    search: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => val.length <= 150, {
        message: "Search must be 150 characters or fewer",
      })
      .transform((val) => (val === "" ? undefined : val))
      .optional(),
    role: z
      .union([
        z.enum(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"], {
          message: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR",
        }),
        z.literal("").transform(() => undefined),
      ])
      .optional(),
  })
  .strict();

/**
 * Validation schema for POST /api/admin/users (AC-17, BR-13, BR-31, BR-33, FR-16).
 */
export const createAdminUserSchema = z
  .object({
    name: z
      .string({ error: "Full name is required" })
      .trim()
      .min(2, "Full name must be at least 2 characters long")
      .max(100, "Full name must be at most 100 characters long"),
    email: z
      .string({ error: "Email address is required" })
      .trim()
      .toLowerCase()
      .email({ message: "A valid email address is required" }),
    role: z.enum(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"], {
      error: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR",
    }),
    isActive: z.boolean().optional().default(true),
    initialPassword: z
      .string({ error: "Initial password is required" })
      .min(8, "Initial password must be at least 8 characters long"),
  })
  .strict();

/**
 * Validation schema for PATCH /api/admin/users/:id (AC-18, AC-19, BR-29, BR-30, FR-17).
 */
export const patchAdminUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters long")
      .max(100, "Full name must be at most 100 characters long")
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: "A valid email address is required" })
      .optional(),
    role: z
      .enum(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"], {
        error: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR",
      })
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.role !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one field must be provided to update",
      path: ["update"],
    },
  );

/**
 * Validation schema for POST /api/admin/users/:id/reset-password (AC-20, BR-33, FR-18).
 */
export const resetPasswordSchema = z
  .object({
    initialPassword: z
      .string({ error: "Initial password is required" })
      .min(8, "Initial password must be at least 8 characters long"),
  })
  .strict();
