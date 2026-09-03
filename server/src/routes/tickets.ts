import express, { type Request, type Response } from "express";
import { z } from "zod";

import { sendError } from "../errors";
import type { Prisma } from "../generated/prisma/client";
import {
  rejectRequesterIdInBody,
  requireRequesterContext,
} from "../middleware/requester-context";
import { prisma } from "../prisma";
import { serializeAttachments } from "../tickets/attachment-serializer";
import { handleCreateTicket } from "../tickets/create-ticket";
import {
  getTicketAttachments,
  postTicketAttachmentHandlers,
} from "./attachments";

const listTicketsQuerySchema = z
  .object({
    search: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => val.length <= 150, {
        message: "Search must be 150 characters or fewer",
      })
      .transform((val) => (val === "" ? undefined : val))
      .optional(),
    categoryId: z
      .string()
      .regex(/^[1-9]\d*$/, {
        message: "Category ID must be a positive integer",
      })
      .transform((val) => parseInt(val, 10))
      .optional(),
    requestedPriority: z
      .enum(["LOW", "MEDIUM", "HIGH"], {
        message: "Requested priority must be LOW, MEDIUM, or HIGH",
      })
      .optional(),
    status: z
      .enum(["NEW"], {
        message: "Status must be NEW",
      })
      .optional(),
    sort: z
      .enum(["createdAt", "ticketNumber", "updatedAt"], {
        message: "Sort field must be createdAt, ticketNumber, or updatedAt",
      })
      .optional()
      .transform((val) => val ?? "createdAt"),
    order: z
      .enum(["asc", "desc"], {
        message: "Order must be asc or desc",
      })
      .optional()
      .transform((val) => val ?? "desc"),
    page: z
      .string()
      .regex(/^[1-9]\d*$/, { message: "Page must be a positive integer" })
      .optional()
      .transform((val) => (val !== undefined ? parseInt(val, 10) : 1)),
    pageSize: z
      .string()
      .refine((val) => ["10", "20", "50"].includes(val), {
        message: "Page size must be 10, 20, or 50",
      })
      .optional()
      .transform((val) =>
        val !== undefined ? (parseInt(val, 10) as 10 | 20 | 50) : 10,
      ),
  })
  .strict();

function formatZodErrors(error: z.ZodError): Record<string, string> {
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

export const ticketsRouter = express.Router();
ticketsRouter.use(requireRequesterContext);

// GET /api/tickets (FR-08, FR-09, BR-07, BR-26, BR-27, BR-28, BR-29, BR-30)
ticketsRouter.get("/", async (req: Request, res: Response) => {
  const parseResult = listTicketsQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    sendError(
      res,
      "INVALID_QUERY_PARAMETER",
      formatZodErrors(parseResult.error),
    );
    return;
  }

  const {
    search,
    categoryId,
    requestedPriority,
    status,
    sort,
    order,
    page,
    pageSize,
  } = parseResult.data;

  try {
    if (categoryId !== undefined) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!categoryExists) {
        sendError(res, "INVALID_QUERY_PARAMETER", {
          categoryId: "Category must reference an existing category",
        });
        return;
      }
    }

    // Requester ownership is ALWAYS enforced first (BR-07, AC-20)
    const where: Prisma.TicketWhereInput = {
      requesterId: req.requesterId!,
    };

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }

    if (requestedPriority !== undefined) {
      where.requestedPriority = requestedPriority;
    }

    if (status !== undefined) {
      where.status = status;
    }

    // Sorting always carries id: 'desc' as a stable secondary tiebreak (BR-28, AC-28)
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [sort]: order },
      { id: "desc" },
    ];

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [tickets, totalItems] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          status: true,
          category: {
            select: { id: true, name: true },
          },
          relatedSystem: {
            select: { id: true, name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      data: tickets,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

// POST /api/tickets (FR-05, FR-06, BR-01, BR-02, BR-11, BR-12)
ticketsRouter.post("/", rejectRequesterIdInBody, handleCreateTicket);

// GET /api/tickets/:ticketId/attachments (FR-11, BR-07, BR-35, BR-39)
ticketsRouter.get("/:ticketId/attachments", getTicketAttachments);

// POST /api/tickets/:ticketId/attachments (FR-12, BR-32, BR-33, BR-34, BR-35, BR-37, BR-40, BR-41)
ticketsRouter.post("/:ticketId/attachments", ...postTicketAttachmentHandlers);

// GET /api/tickets/:id (FR-10, BR-07, BR-08, BR-37, AC-29, AC-30)
ticketsRouter.get("/:id", async (req: Request, res: Response) => {
  const requesterId = req.requesterId;
  if (!requesterId) {
    sendError(res, "REQUESTER_CONTEXT_MISSING");
    return;
  }

  const idResult = z
    .string()
    .regex(/^[1-9]\d*$/)
    .safeParse(req.params.id);
  if (!idResult.success) {
    // Non-numeric or invalid id produces identical 404 without leaking validity (BR-08)
    sendError(res, "TICKET_NOT_FOUND");
    return;
  }

  const id = parseInt(idResult.data, 10);

  try {
    // One query with ownership in the where clause (BR-07, BR-08, ADR-0005)
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        requesterId,
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
        attachments: {
          orderBy: { createdAt: "asc" },
          include: {
            uploadedBy: { select: { id: true, name: true } },
            removedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ticket) {
      // Missing and unowned tickets are indistinguishable to caller (BR-08),
      // distinguished only in server logs (api-spec.md).
      const existsUnowned = await prisma.ticket.findUnique({
        where: { id },
        select: { requesterId: true },
      });

      if (existsUnowned) {
        console.warn(
          `[TICKET] Ownership refusal: ticket ${id} belongs to requester ${existsUnowned.requesterId}, accessed by ${req.requesterId}`,
        );
      } else {
        console.info(`[TICKET] Ticket ${id} not found`);
      }

      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      status: ticket.status,
      category: { id: ticket.category.id, name: ticket.category.name },
      relatedSystem: {
        id: ticket.relatedSystem.id,
        name: ticket.relatedSystem.name,
      },
      requester: { id: ticket.requester.id, name: ticket.requester.name },
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      attachments: serializeAttachments(ticket.attachments),
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});
