import { z } from "zod";

import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../prisma";

export const expectedVersionSchema = z.number().int().nonnegative();

// BR-12: the predicate and increment share one SQL write, including under contention.
export async function updateTicketAtVersion(
  id: number,
  expectedVersion: number,
  data: Prisma.TicketUncheckedUpdateManyInput,
) {
  const [updated] = await prisma.ticket.updateManyAndReturn({
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
  return updated;
}
