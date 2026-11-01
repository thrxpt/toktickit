import type { NextFunction, Request, Response } from "express";

import { sendError } from "../errors";
import { requireAuth } from "./auth";

declare global {
  namespace Express {
    interface Request {
      requesterId?: number;
    }
  }
}

// BR-30: only authenticated Requesters establish ownership.
export async function requireRequesterContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "REQUESTER") {
      sendError(res, "FORBIDDEN");
      return;
    }
    next();
  });
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
