import { z } from "zod";

/**
 * Validates and parses a positive integer ID parameter (e.g. :id in route paths).
 * Returns null if the value is missing, non-numeric, zero, negative, or exceeds Postgres integer range.
 */
export function parsePositiveIntId(
  param: string | string[] | undefined,
): number | null {
  if (typeof param !== "string") {
    return null;
  }
  const result = z.string().regex(/^[1-9]\d*$/).safeParse(param);
  if (!result.success) {
    return null;
  }
  const parsed = parseInt(result.data, 10);
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) {
    return null;
  }
  return parsed;
}
