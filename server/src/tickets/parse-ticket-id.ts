import { z } from "zod";

export function parseTicketId(
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

export const parsePositiveIntId = parseTicketId;
