import type { NextFunction, Request, Response } from "express";

import { sendError } from "../errors";
import { prisma } from "../prisma";

declare global {
  namespace Express {
    interface Request {
      requesterId?: number;
    }
  }
}

// Resolves X-Requester-Id once and attaches req.requesterId: number (ADR-0003).
// Applied to every route except /api/health, /api/categories, /api/related-systems,
// and /api/requesters (api-spec.md, "Requester context").
export async function requireRequesterContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("X-Requester-Id");

  if (!header || header.trim() === "") {
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
    Object.prototype.hasOwnProperty.call(req.body, "requesterId")
  ) {
    sendError(res, "REQUESTER_ID_IN_BODY");
    return;
  }
  next();
}
