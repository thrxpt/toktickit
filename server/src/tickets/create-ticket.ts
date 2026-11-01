import type { Request, Response } from "express";

import { sendError } from "../errors";
import { prisma } from "../prisma";
import { createOnce, submissionKey } from "../submissions";
import { formatTicketNumber } from "./ticket-number";
import { createTicketSchema, formatZodFields } from "./ticket-schema";

export async function handleCreateTicket(req: Request, res: Response): Promise<void> {
  const parseResult = createTicketSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, "VALIDATION_FAILED", formatZodFields(parseResult.error));
    return;
  }

  const data = parseResult.data;
  const requesterId = req.requesterId;
  if (!requesterId) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  const key = submissionKey(req, data);
  const include = {
    category: { select: { id: true, name: true } },
    relatedSystem: { select: { id: true, name: true } },
    requester: { select: { id: true, name: true } },
  } as const;
  try {
    const ticket = await createOnce(key,
      () => prisma.ticket.findUnique({ where: { submissionKey: key! }, include }),
      async () => {
        // A replay returns the owned record even if reference data was deactivated
        // afterward. Only a new Ticket needs currently active references (BR-33).
        const [category, relatedSystem] = await Promise.all([
          prisma.category.findUnique({ where: { id: data.categoryId }, select: { isActive: true } }),
          prisma.relatedSystem.findUnique({ where: { id: data.relatedSystemId }, select: { isActive: true } }),
        ]);
        const fields: Record<string, string> = {};
        if (!category?.isActive) fields.categoryId = "Selected category is inactive or does not exist.";
        if (!relatedSystem?.isActive) fields.relatedSystemId = "Selected related system is inactive or does not exist.";
        if (Object.keys(fields).length > 0) {
          sendError(res, "VALIDATION_FAILED", fields);
          return null;
        }

        return prisma.$transaction(async tx => {
          const rows = await tx.$queryRaw<{ nextval: bigint | number | string }[]>`
            SELECT nextval('ticket_number_seq')
          `;
          return tx.ticket.create({
            data: {
              ticketNumber: formatTicketNumber(Number(rows[0].nextval), new Date().getFullYear()),
              submissionKey: key,
              requesterId,
              ...data,
              status: "NEW",
            },
            include,
          });
        });
      },
    );
    if (!ticket) return;

    res.setHeader("Location", `/api/tickets/${ticket.id}`);
    res.status(201).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      version: ticket.version,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      status: ticket.status,
      category: { id: ticket.category.id, name: ticket.category.name },
      relatedSystem: { id: ticket.relatedSystem.id, name: ticket.relatedSystem.name },
      requester: { id: ticket.requester.id, name: ticket.requester.name },
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      sendError(res, "TICKET_NUMBER_CONFLICT");
      return;
    }
    sendError(res, "DATABASE_UNAVAILABLE");
  }
}
