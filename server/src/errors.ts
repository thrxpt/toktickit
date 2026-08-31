// One envelope for every failure on every route (api-spec.md, "Error
// envelope"): { "error": { code, message } }.
//
// Each code carries its own status, so a caller cannot pair a failure code
// with a success status. `message` is always safe to display, and no response
// ever carries a stack trace, SQL, a Prisma error, a filesystem path, or an
// internal identifier (BR-43) — which is why callers pass a code from the
// table below rather than anything derived from the error they caught.
//
// The envelope's optional `fields` member arrives with routes that
// validate input (Decision D-16).
import type { Response } from "express";

export type ErrorCode =
  | "DATABASE_UNAVAILABLE"
  | "REQUESTER_CONTEXT_MISSING"
  | "REQUESTER_CONTEXT_INVALID"
  | "REQUESTER_INACTIVE"
  | "REQUESTER_ID_IN_BODY"
  | "INVALID_QUERY_PARAMETER"
  | "VALIDATION_FAILED";

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
  INVALID_QUERY_PARAMETER: {
    status: 400,
    message: "One or more query parameters are invalid",
  },
  VALIDATION_FAILED: {
    status: 400,
    message: "One or more fields are invalid",
  },
};

export function sendError(
  res: Response,
  code: ErrorCode,
  fields?: Record<string, string>,
): void {
  const { status, message } = failures[code];

  const errorObj: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
  } = {
    code,
    message,
  };

  if (fields && Object.keys(fields).length > 0) {
    errorObj.fields = fields;
  }

  res.status(status).json({ error: errorObj });
}
