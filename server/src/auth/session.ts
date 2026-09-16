import type { Response } from "express";
import jwt from "jsonwebtoken";

import type { Role } from "../generated/prisma/client";

export const SESSION_COOKIE_NAME = "toktickit_session";

// Secret used for signing session tokens (ADR-0007).
const JWT_SECRET = (() => {
  const secret = process.env["JWT_SECRET"];
  if (secret) {
    return secret;
  }
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "JWT_SECRET environment variable must be set in production.",
    );
  }
  return "toktickit-dev-jwt-secret-key-for-sessions-2026";
})();

export interface SessionPayload {
  userId: number;
  email: string;
  role: Role;
}

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function clearSessionCookie(res: Response): void {
  res.cookie(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 0,
  });
}
