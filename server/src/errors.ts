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
  | "VALIDATION_FAILED"
  | "TICKET_NUMBER_CONFLICT"
  | "TICKET_NOT_FOUND"
  | "ATTACHMENT_LIMIT_REACHED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "ATTACHMENT_NOT_FOUND";

const failures = {
  DATABASE_UNAVAILABLE: {
    status: 500,
    message: "Unable to reach the database",
  },
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
    message: "One or more fields are invalid.",
  },
  TICKET_NUMBER_CONFLICT: {
    status: 409,
    message: "A ticket number conflict occurred. Please contact support.",
  },
  TICKET_NOT_FOUND: {
    status: 404,
    message: "Ticket not found",
  },
  ATTACHMENT_LIMIT_REACHED: {
    status: 409,
    message: "A ticket may hold at most 5 active attachments.",
  },
  FILE_TOO_LARGE: {
    status: 413,
    message: "Each file must be 5 MB or smaller.",
  },
  UNSUPPORTED_FILE_TYPE: {
    status: 415,
    message:
      "Unsupported file type. Permitted types are JPG, PNG, WEBP, and PDF.",
  },
  ATTACHMENT_NOT_FOUND: {
    status: 404,
    message: "Attachment not found",
  },
} satisfies Record<ErrorCode, { status: number; message: string }>;

export function sendError(
  res: Response,
  code: ErrorCode,
  fields?: Record<string, string>,
): void {
  const { status, message } = failures[code];

  if (fields && Object.keys(fields).length > 0) {
    res.status(status).json({ error: { code, message, fields } });
  } else {
    res.status(status).json({ error: { code, message } });
  }
}
