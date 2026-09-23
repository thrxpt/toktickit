import express, { type Request, type Response } from "express";

import { hashPassword } from "../auth/password";
import { formatZodErrors, sendError } from "../errors";
import type { Prisma } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../prisma";
import { parsePositiveIntId } from "../tickets/parse-ticket-id";
import {
  adminUserQuerySchema,
  createAdminUserSchema,
  patchAdminUserSchema,
  resetPasswordSchema,
} from "./users-admin.schema";

export const usersAdminRouter = express.Router();

// Guarded by authentication and role check (ADMINISTRATOR only; Requesters and IT Staff receive 403 Forbidden per BR-14, BR-15, and ADR-0008).
usersAdminRouter.use(requireAuth);
usersAdminRouter.use(requireRole("ADMINISTRATOR"));

/**
 * GET /api/admin/users (AC-16, FR-15, API-18)
 * Lists all users with optional substring search and role filter.
 */
usersAdminRouter.get("/", async (req: Request, res: Response) => {
  const parseResult = adminUserQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    sendError(
      res,
      "INVALID_QUERY_PARAMETER",
      formatZodErrors(parseResult.error),
    );
    return;
  }

  const { search, role } = parseResult.data;

  try {
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    res.status(200).json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

/**
 * POST /api/admin/users (AC-17, BR-13, BR-31, BR-33, FR-16, API-19)
 * Creates a new user with an initial password and sets mustChangePassword: true.
 */
usersAdminRouter.post("/", async (req: Request, res: Response) => {
  const parseResult = createAdminUserSchema.safeParse(req.body);

  if (!parseResult.success) {
    sendError(res, "VALIDATION_FAILED", formatZodErrors(parseResult.error));
    return;
  }

  const { name, email, role, isActive, initialPassword } = parseResult.data;

  try {
    // BR-31: Email addresses must be unique across all users (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });

    if (existing) {
      sendError(res, "DUPLICATE_EMAIL", {
        email: "A user with this email address already exists.",
      });
      return;
    }

    const passwordHash = await hashPassword(initialPassword);

    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        isActive,
        passwordHash,
        mustChangePassword: true, // AC-02, BR-33: user must change password at next login
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    res.status(201).json({
      user: createdUser,
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

/**
 * PATCH /api/admin/users/:id (AC-18, AC-19, BR-29, BR-30, BR-31, FR-17, API-20, API-21)
 * Edits an existing user's information and active state with safety protections.
 */
usersAdminRouter.patch("/:id", async (req: Request, res: Response) => {
  const id = parsePositiveIntId(req.params.id);
  if (id === null) {
    sendError(res, "VALIDATION_FAILED", {
      id: "User ID must be a positive integer",
    });
    return;
  }

  const parseResult = patchAdminUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, "VALIDATION_FAILED", formatZodErrors(parseResult.error));
    return;
  }

  const { name, email, role, isActive } = parseResult.data;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      sendError(res, "USER_NOT_FOUND");
      return;
    }

    // BR-29, AC-18, API-20: Administrator cannot deactivate own account
    if (targetUser.id === req.user?.id && isActive === false) {
      sendError(res, "CANNOT_DEACTIVATE_SELF");
      return;
    }

    // BR-30, AC-19, API-21: Cannot deactivate or demote the last active Administrator
    if (
      targetUser.role === "ADMINISTRATOR" &&
      targetUser.isActive &&
      (isActive === false || (role !== undefined && role !== "ADMINISTRATOR"))
    ) {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });
      if (activeAdminCount <= 1) {
        sendError(res, "CANNOT_DEACTIVATE_LAST_ADMIN");
        return;
      }
    }

    // BR-31: Unique email check if email is modified
    if (email && email !== targetUser.email.toLowerCase()) {
      const duplicate = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicate) {
        sendError(res, "DUPLICATE_EMAIL", {
          email: "A user with this email address already exists.",
        });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    res.status(200).json({
      user: updatedUser,
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

/**
 * POST /api/admin/users/:id/reset-password (AC-20, BR-33, FR-18, API-22)
 * Sets a new initial password and forces mustChangePassword: true.
 */
usersAdminRouter.post(
  "/:id/reset-password",
  async (req: Request, res: Response) => {
    const id = parsePositiveIntId(req.params.id);
    if (id === null) {
      sendError(res, "VALIDATION_FAILED", {
        id: "User ID must be a positive integer",
      });
      return;
    }

    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, "VALIDATION_FAILED", formatZodErrors(parseResult.error));
      return;
    }

    const { initialPassword } = parseResult.data;

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!targetUser) {
        sendError(res, "USER_NOT_FOUND");
        return;
      }

      const passwordHash = await hashPassword(initialPassword);

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true, // BR-33, AC-20
        },
      });

      res.status(200).json({
        message:
          "Initial password updated. User will be required to change password at next login.",
      });
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);
