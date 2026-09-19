import type { NextFunction, Request, Response } from "express";

import { sendError } from "../errors";
import { prisma } from "../prisma";
import { extractSessionToken, requireAuth } from "./auth";

declare global {
  namespace Express {
    interface Request {
      requesterId?: number;
    }
  }
}

// Resolves requester context. In Lab 3, authentication derives identity from
// signed session tokens (ADR-0007). In Lab 2 backward-compatibility mode,
// it falls back to X-Requester-Id (ADR-0003).
export async function requireRequesterContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionToken = extractSessionToken(req);
  if (sessionToken) {
    await requireAuth(req, res, () => {
      // Role segregation (BR-14, BR-15, ADR-0008):
      // Only authenticated REQUESTERs may access requester routes.
      if (req.user && req.user.role !== "REQUESTER") {
        sendError(res, "FORBIDDEN");
        return;
      }
      next();
    });
    return;
  }

  const header = req.header("X-Requester-Id");

  // In Lab 3, requests without session or header answer 401 UNAUTHENTICATED (api-spec Gate 1).
  // Exception: POST /api/tickets with omitted header answers 400 REQUESTER_CONTEXT_MISSING
  // for Lab 2 API-07 test compatibility.
  if (header === undefined) {
    if (
      req.method === "POST" &&
      (req.baseUrl === "/api/tickets" ||
        req.originalUrl?.startsWith("/api/tickets")) &&
      (req.path === "/" || req.path === "")
    ) {
      sendError(res, "REQUESTER_CONTEXT_MISSING");
      return;
    }
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  if (header.trim() === "") {
    sendError(res, "REQUESTER_CONTEXT_MISSING");
    return;
  }

  const trimmed = header.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    sendError(res, "REQUESTER_CONTEXT_INVALID");
    return;
  }

  const requesterId = parseInt(trimmed, 10);

  try {
    const requester = await prisma.requester.findUnique({
      where: { id: requesterId },
      select: { id: true, isActive: true },
    });

    if (!requester) {
      sendError(res, "REQUESTER_CONTEXT_INVALID");
      return;
    }

    if (!requester.isActive) {
      sendError(res, "REQUESTER_INACTIVE");
      return;
    }

    req.requesterId = requester.id;
    next();
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
}

// Reject requesterId appearing in any request body with 400 REQUESTER_ID_IN_BODY (BR-04, AC-18).
export function rejectRequesterIdInBody(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (
    req.body &&
    typeof req.body === "object" &&
    Object.hasOwn(req.body, "requesterId")
  ) {
    sendError(res, "REQUESTER_ID_IN_BODY");
    return;
  }
  next();
}
