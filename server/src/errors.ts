// One envelope for every failure on every route (api-spec.md, "Error
// envelope"): { "error": { code, message } }.
//
// Each code carries its own status, so a caller cannot pair a failure code
// with a success status. `message` is always safe to display, and no response
// ever carries a stack trace, SQL, a Prisma error, a filesystem path, or an
// internal identifier (BR-43) — which is why callers pass a code from the
// table below rather than anything derived from the error they caught.
//
// The envelope's optional `fields` member arrives with the first route that
// validates input (Decision D-16); nothing here takes input yet.
import type { Response } from "express";

export type ErrorCode =
  | "DATABASE_UNAVAILABLE"
  | "REQUESTER_CONTEXT_MISSING"
  | "REQUESTER_CONTEXT_INVALID"
  | "REQUESTER_INACTIVE"
  | "REQUESTER_ID_IN_BODY";

const failures: Record<ErrorCode, { status: number; message: string }> = {
  DATABASE_UNAVAILABLE: { status: 500, message: "Unable to reach the database" },
  REQUESTER_CONTEXT_MISSING: {
    status: 400,
    message: "Development Requester context header is missing",
  },
  REQUESTER_CONTEXT_INVALID: {
    status: 400,
    message: "Development Requester context is invalid or unknown",
  },
  REQUESTER_INACTIVE: {
    status: 400,
    message: "Development Requester is inactive",
  },
  REQUESTER_ID_IN_BODY: {
    status: 400,
    message: "requesterId must not be supplied in the request body",
  },
};

export function sendError(res: Response, code: ErrorCode): void {
  const { status, message } = failures[code];

  res.status(status).json({ error: { code, message } });
}
