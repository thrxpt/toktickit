import type { Request, Response } from "express";

import { sendError } from "../errors";
import { prisma } from "../prisma";
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
    sendError(res, "REQUESTER_CONTEXT_MISSING");
    return;
  }

  // Verify category and related system are active before opening the transaction,
  // avoiding sequence consumption on invalid reference data (BR-12, BR-16, BR-17).
  try {
    const [category, relatedSystem] = await Promise.all([
      prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true, name: true, isActive: true },
      }),
      prisma.relatedSystem.findUnique({
        where: { id: data.relatedSystemId },
        select: { id: true, name: true, isActive: true },
      }),
    ]);

    const fieldErrors: Record<string, string> = {};

    if (!category || !category.isActive) {
      fieldErrors.categoryId = "Selected category is inactive or does not exist.";
    }

    if (!relatedSystem || !relatedSystem.isActive) {
      fieldErrors.relatedSystemId = "Selected related system is inactive or does not exist.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      sendError(res, "VALIDATION_FAILED", fieldErrors);
      return;
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const seqRows = await tx.$queryRaw<{ nextval: bigint | number | string }[]>`
        SELECT nextval('ticket_number_seq')
      `;
      const nextVal = Number(seqRows[0].nextval);
      const ticketNumber = formatTicketNumber(nextVal, new Date().getFullYear());

      return await tx.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId: data.categoryId,
          relatedSystemId: data.relatedSystemId,
          summary: data.summary,
          description: data.description,
          requestedPriority: data.requestedPriority,
          status: "NEW",
        },
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
        },
      });
    });

    res.setHeader("Location", `/api/tickets/${ticket.id}`);
    res.status(201).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
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
