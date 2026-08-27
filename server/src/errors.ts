// One envelope for every failure on every route (api-spec.md, "Error
// envelope"): { "error": { code, message, fields? } }.
//
// `message` is always safe to display. No response ever carries a stack trace,
// SQL, a Prisma error, a filesystem path, or an internal identifier (BR-43) —
// which is why callers pass a code from the table below rather than anything
// derived from the error they caught.
import type { Response } from "express";

export type ErrorCode = "DATABASE_UNAVAILABLE" | "INTERNAL_ERROR";

const messages: Record<ErrorCode, string> = {
  DATABASE_UNAVAILABLE: "Unable to reach the database",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  fields?: Record<string, string>,
): void {
  const error: { code: ErrorCode; message: string; fields?: Record<string, string> } = {
    code,
    message: messages[code],
  };

  if (fields) {
    error.fields = fields;
  }

  res.status(status).json({ error });
}
