import type { NextFunction, Request, Response } from "express";

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "../auth/session";
import { sendError } from "../errors";
import type { Role } from "../generated/prisma/client";
import { prisma } from "../prisma";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts session token from cookie (primary) or Authorization: Bearer header (testing fallback).
 * ADR-0007.
 */
export function extractSessionToken(req: Request): string | null {
  if (req.cookies && typeof req.cookies[SESSION_COOKIE_NAME] === "string") {
    return req.cookies[SESSION_COOKIE_NAME];
  }

  const authHeader = req.header("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) {
      return token;
    }
  }

  return null;
}

/**
 * Authentication middleware enforcing authenticated session, active account check,
 * and the mandatory password change gate (BR-01, BR-02, BR-10, AC-01, AC-02, AC-04).
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractSessionToken(req);
  if (!token) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      sendError(res, "UNAUTHENTICATED");
      return;
    }

    // BR-10, BR-34: Inactive accounts cannot interact with protected endpoints.
    if (!user.isActive) {
      sendError(res, "ACCOUNT_INACTIVE");
      return;
    }

    req.user = user;
    req.requesterId = user.id;

    // BR-02, AC-02: Mandatory password change gate.
    // Users with mustChangePassword === true can only access /api/auth/change-password,
    // /api/auth/me, and /api/auth/logout.
    if (user.mustChangePassword) {
      const url = req.originalUrl || req.url;
      const isWhitelisted =
        url.includes("/api/auth/change-password") ||
        url.includes("/api/auth/me") ||
        url.includes("/api/auth/logout");

      if (!isWhitelisted) {
        sendError(res, "PASSWORD_CHANGE_REQUIRED");
        return;
      }
    }

    next();
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
}

/**
 * Role-based authorization middleware (BR-14, BR-15, ADR-0008).
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "UNAUTHENTICATED");
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, "FORBIDDEN");
      return;
    }

    next();
  };
}
