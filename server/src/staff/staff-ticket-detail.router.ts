import express, { type Request, type Response } from "express";
import { z } from "zod";

import { formatZodErrors, sendError } from "../errors";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../prisma";
import { serializeActiveAttachment } from "../tickets/attachment-serializer";
import { parseTicketId } from "../tickets/parse-ticket-id";
import { isValidStatusTransition } from "../tickets/status-machine";

export const staffTicketDetailRouter = express.Router();

// Guarded by authentication and role check (IT_STAFF only; Requesters and Administrators receive 403 Forbidden per BR-14 and ADR-0008).
staffTicketDetailRouter.use(requireAuth);
staffTicketDetailRouter.use(requireRole("IT_STAFF"));

const ownerPatchSchema = z
  .object({
    ownerId: z.number().int().positive().nullable(),
  })
  .strict();

const priorityPatchSchema = z
  .object({
    itPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  })
  .strict();

const statusPatchSchema = z
  .object({
    status: z.enum([
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ]),
  })
  .strict();

// GET /api/staff/tickets/:id (FR-10, BR-14, BR-15)
staffTicketDetailRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseTicketId(req.params.id);
  if (id === null) {
    sendError(res, "VALIDATION_FAILED", {
      id: "Ticket ID must be a positive integer",
    });
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        ticketOwner: { select: { id: true, name: true } },
        attachments: {
          where: { removedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            comments: true,
            internalNotes: true,
          },
        },
      },
    });

    if (!ticket) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      category: {
        id: ticket.category.id,
        name: ticket.category.name,
      },
      relatedSystem: {
        id: ticket.relatedSystem.id,
        name: ticket.relatedSystem.name,
      },
      requester: {
        id: ticket.requester.id,
        name: ticket.requester.name,
        email: ticket.requester.email,
      },
      ticketOwner: ticket.ticketOwner
        ? {
            id: ticket.ticketOwner.id,
            name: ticket.ticketOwner.name,
          }
        : null,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      status: ticket.status,
      resolvedByRequester: ticket.resolvedByRequester,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      attachments: ticket.attachments.map(serializeActiveAttachment),
      publicCommentsCount: ticket._count.comments,
      internalNotesCount: ticket._count.internalNotes,
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

// PATCH /api/staff/tickets/:id/owner (AC-11, BR-18, BR-23)
staffTicketDetailRouter.patch(
  "/:id/owner",
  async (req: Request, res: Response) => {
    const id = parseTicketId(req.params.id);
    if (id === null) {
      sendError(res, "VALIDATION_FAILED", {
        id: "Ticket ID must be a positive integer",
      });
      return;
    }

    const parseResult = ownerPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(
        res,
        "VALIDATION_FAILED",
        formatZodErrors(parseResult.error),
      );
      return;
    }

    const { ownerId } = parseResult.data;

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!ticket) {
        sendError(res, "TICKET_NOT_FOUND");
        return;
      }

      // If ownerId is provided, verify user is active and has IT_STAFF or ADMINISTRATOR role (BR-18)
      if (ownerId !== null) {
        const targetUser = await prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, role: true, isActive: true },
        });

        if (
          !targetUser ||
          !targetUser.isActive ||
          (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")
        ) {
          sendError(res, "VALIDATION_FAILED", {
            ownerId: "Specified user is inactive or not an IT Staff / Administrator.",
          });
          return;
        }
      }

      // Auto-advance NEW tickets to OPEN on claiming/assignment to IT staff (BR-23)
      const newStatus =
        ticket.status === "NEW" && ownerId !== null ? "OPEN" : ticket.status;

      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          ticketOwnerId: ownerId,
          status: newStatus,
        },
        select: {
          id: true,
          ticketOwnerId: true,
          status: true,
        },
      });

      res.status(200).json({
        ticketId: updated.id,
        ticketOwnerId: updated.ticketOwnerId,
        status: updated.status,
        message: "Ticket ownership updated.",
      });
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);

// PATCH /api/staff/tickets/:id/priority (AC-12, BR-19, BR-20)
staffTicketDetailRouter.patch(
  "/:id/priority",
  async (req: Request, res: Response) => {
    const id = parseTicketId(req.params.id);
    if (id === null) {
      sendError(res, "VALIDATION_FAILED", {
        id: "Ticket ID must be a positive integer",
      });
      return;
    }

    const parseResult = priorityPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(
        res,
        "VALIDATION_FAILED",
        formatZodErrors(parseResult.error),
      );
      return;
    }

    const { itPriority } = parseResult.data;

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!ticket) {
        sendError(res, "TICKET_NOT_FOUND");
        return;
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: { itPriority },
        select: {
          id: true,
          itPriority: true,
        },
      });

      res.status(200).json({
        ticketId: updated.id,
        itPriority: updated.itPriority,
        message: "IT Priority updated.",
      });
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);

// PATCH /api/staff/tickets/:id/status (AC-13, BR-21, BR-22)
staffTicketDetailRouter.patch(
  "/:id/status",
  async (req: Request, res: Response) => {
    const id = parseTicketId(req.params.id);
    if (id === null) {
      sendError(res, "VALIDATION_FAILED", {
        id: "Ticket ID must be a positive integer",
      });
      return;
    }

    const parseResult = statusPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(
        res,
        "VALIDATION_FAILED",
        formatZodErrors(parseResult.error),
      );
      return;
    }

    const { status: nextStatus } = parseResult.data;

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!ticket) {
        sendError(res, "TICKET_NOT_FOUND");
        return;
      }

      if (!isValidStatusTransition(ticket.status, nextStatus)) {
        sendError(
          res,
          "INVALID_STATUS_TRANSITION",
          undefined,
          `Cannot transition status from ${ticket.status} directly to ${nextStatus}.`,
        );
        return;
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: { status: nextStatus },
        select: {
          id: true,
          status: true,
        },
      });

      res.status(200).json({
        ticketId: updated.id,
        status: updated.status,
        message: "Status updated successfully.",
      });
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);
