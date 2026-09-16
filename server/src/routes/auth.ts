import express, { type Request, type Response } from "express";
import { z } from "zod";

import {
  hashPassword,
  passwordPolicySchema,
  verifyPassword,
} from "../auth/password";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "../auth/session";
import { formatZodErrors, sendError } from "../errors";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";

export const authRouter = express.Router();

const loginSchema = z.object({
  email: z
    .string({ error: "Email is required." })
    .trim()
    .email("A valid email address is required."),
  password: z
    .string({ error: "Password is required." })
    .min(1, "Password is required."),
});

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Current password is required." })
      .min(1, "Current password is required."),
    newPassword: passwordPolicySchema,
    confirmPassword: z
      .string({ error: "Confirmation password is required." })
      .min(1, "Confirmation password is required."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current password.",
    path: ["newPassword"],
  });

/**
 * POST /api/auth/login (FR-01, BR-01, BR-08, BR-09, BR-10, AC-01, AC-04)
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, "VALIDATION_FAILED", formatZodErrors(parseResult.error));
    return;
  }

  const { email, password } = parseResult.data;

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    // BR-09, API-25: Generic error message to prevent user enumeration
    if (!user) {
      sendError(res, "INVALID_CREDENTIALS");
      return;
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      sendError(res, "INVALID_CREDENTIALS");
      return;
    }

    // BR-10, AC-04, API-02: Deactivated account notice
    if (!user.isActive) {
      sendError(res, "ACCOUNT_INACTIVE");
      return;
    }

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    setSessionCookie(res, token);

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      token,
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

/**
 * POST /api/auth/logout (FR-05, BR-11, AC-05, API-05)
 */
authRouter.post("/logout", requireAuth, (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.status(200).json({ message: "Logged out successfully." });
});

/**
 * GET /api/auth/me (FR-04, AC-01)
 */
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  if (!req.user) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  res.status(200).json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      mustChangePassword: req.user.mustChangePassword,
    },
  });
});

/**
 * POST /api/auth/change-password (FR-03, BR-02, BR-07, BR-12, AC-03, API-04)
 */
authRouter.post(
  "/change-password",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, "UNAUTHENTICATED");
      return;
    }

    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, "VALIDATION_FAILED", formatZodErrors(parseResult.error));
      return;
    }

    const { currentPassword, newPassword } = parseResult.data;

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        sendError(res, "UNAUTHENTICATED");
        return;
      }

      const isCurrentValid = await verifyPassword(
        currentPassword,
        user.passwordHash,
      );
      if (!isCurrentValid) {
        sendError(
          res,
          "INVALID_CREDENTIALS",
          undefined,
          "Current password is incorrect.",
        );
        return;
      }

      const newPasswordHash = await hashPassword(newPassword);

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          mustChangePassword: true,
        },
      });

      res.status(200).json({
        user: updatedUser,
        message: "Password changed successfully.",
      });
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);
