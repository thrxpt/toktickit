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
import type { z } from "zod";

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
  | "ATTACHMENT_NOT_FOUND"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "FORBIDDEN"
  | "DUPLICATE_EMAIL"
  | "CANNOT_DEACTIVATE_SELF"
  | "CANNOT_DEACTIVATE_LAST_ADMIN"
  | "INVALID_STATUS_TRANSITION";

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
  UNAUTHENTICATED: {
    status: 401,
    message: "Authentication required.",
  },
  INVALID_CREDENTIALS: {
    status: 401,
    message: "Invalid email or password.",
  },
  ACCOUNT_INACTIVE: {
    status: 401,
    message: "Account is deactivated. Please contact an administrator.",
  },
  PASSWORD_CHANGE_REQUIRED: {
    status: 403,
    message: "Password change is required before continuing.",
  },
  FORBIDDEN: {
    status: 403,
    message: "You do not have permission to access this resource.",
  },
  DUPLICATE_EMAIL: {
    status: 409,
    message: "A user with this email address already exists.",
  },
  CANNOT_DEACTIVATE_SELF: {
    status: 400,
    message: "Administrators cannot deactivate their own accounts.",
  },
  CANNOT_DEACTIVATE_LAST_ADMIN: {
    status: 400,
    message: "Cannot deactivate or demote the last active Administrator.",
  },
  INVALID_STATUS_TRANSITION: {
    status: 400,
    message: "Invalid status transition.",
  },
} satisfies Record<ErrorCode, { status: number; message: string }>;

export function sendError(
  res: Response,
  code: ErrorCode,
  fields?: Record<string, string>,
  customMessage?: string,
): void {
  const failure = failures[code];
  const status = failure.status;
  const message = customMessage ?? failure.message;

  if (fields && Object.keys(fields).length > 0) {
    res.status(status).json({ error: { code, message, fields } });
  } else {
    res.status(status).json({ error: { code, message } });
  }
}

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        fields[key] = `Unrecognized query parameter '${key}'`;
      }
    } else {
      const fieldName = issue.path[0];
      if (typeof fieldName === "string" && !fields[fieldName]) {
        fields[fieldName] = issue.message;
      }
    }
  }
  return fields;
}
