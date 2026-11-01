import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { sendError } from "./errors";

// FR-19: a key names one submission by this session user, endpoint and payload.
// The digest keeps the client token internal and makes different payloads distinct.
export function submissionKey(req: Request, payload: unknown): string | null {
  const key = req.header("Idempotency-Key");
  if (!key) return null;
  return createHash("sha256")
    .update(JSON.stringify([req.user!.id, req.baseUrl + req.path, key, payload]))
    .digest("hex");
}

export function validateSubmissionKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("Idempotency-Key");
  if (key !== undefined && !z.uuid().safeParse(key).success) {
    sendError(res, "VALIDATION_FAILED", { idempotencyKey: "Idempotency-Key must be a UUID." });
    return;
  }
  next();
}

// The unique database index arbitrates simultaneous creates. The losing request
// reads the winner's row only after its insert has committed; no in-memory cache.
export async function createOnce<T>(
  key: string | null,
  find: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  if (key) {
    const existing = await find();
    if (existing) return existing;
  }
  try {
    return await create();
  } catch (error) {
    if (key && typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existing = await find();
      if (existing) return existing;
    }
    throw error;
  }
}
