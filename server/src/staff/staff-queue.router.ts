import express, { type Request, type Response } from "express";
import { z } from "zod";

import { formatZodErrors, sendError } from "../errors";
import type { Prisma } from "../generated/prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../prisma";

const staffQueueQuerySchema = z
  .object({
    search: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => val.length <= 150, {
        message: "Search must be 150 characters or fewer",
      })
      .transform((val) => (val === "" ? undefined : val))
      .optional(),
    category: z
      .union([
        z
          .string()
          .regex(/^[1-9]\d*$/, {
            message: "Category must be a positive integer ID",
          })
          .transform((val) => parseInt(val, 10)),
        z.number().int().positive({
          message: "Category must be a positive integer ID",
        }),
      ])
      .optional(),
    status: z
      .enum(
        [
          "NEW",
          "OPEN",
          "IN_PROGRESS",
          "WAITING_FOR_REQUESTER",
          "RESOLVED",
          "CLOSED",
          "REOPENED",
          "CANCELLED",
        ],
        {
          message:
            "Status must be NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, or CANCELLED",
        },
      )
      .optional(),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
        message: "Priority must be LOW, MEDIUM, HIGH, or CRITICAL",
      })
      .optional(),
    owner: z
      .union([
        z
          .string()
          .refine(
            (val) =>
              val === "unassigned" || val === "me" || /^[1-9]\d*$/.test(val),
            {
              message:
                "Owner must be 'unassigned', 'me', or a positive integer ID",
            },
          ),
        z
          .number()
          .int()
          .positive()
          .transform((val) => String(val)),
      ])
      .optional(),
    sortBy: z
      .enum(
        ["createdAt", "ticketNumber", "itPriority", "status", "updatedAt"],
        {
          message:
            "sortBy must be createdAt, ticketNumber, itPriority, status, or updatedAt",
        },
      )
      .optional()
      .transform((val) => val ?? "createdAt"),
    sortOrder: z
      .enum(["asc", "desc"], {
        message: "sortOrder must be asc or desc",
      })
      .optional()
      .transform((val) => val ?? "desc"),
    page: z
      .union([
        z
          .string()
          .regex(/^[1-9]\d*$/, { message: "Page must be a positive integer" })
          .transform((val) => parseInt(val, 10)),
        z.number().int().positive({ message: "Page must be a positive integer" }),
      ])
      .optional()
      .transform((val) => val ?? 1),
    pageSize: z
      .union([
        z
          .string()
          .refine((val) => ["10", "20", "50"].includes(val), {
            message: "pageSize must be 10, 20, or 50",
          })
          .transform((val) => parseInt(val, 10) as 10 | 20 | 50),
        z.literal(10),
        z.literal(20),
        z.literal(50),
      ])
      .optional()
      .transform((val) => (val ?? 10) as 10 | 20 | 50),
  })
  .strict();

export const staffQueueRouter = express.Router();

// Guarded by authentication and role check (IT_STAFF only; Requesters and Administrators receive 403 Forbidden per BR-14 and ADR-0008).
staffQueueRouter.use(requireAuth);
staffQueueRouter.use(requireRole("IT_STAFF"));

// GET /api/staff/tickets (FR-09, AC-10, BR-14, BR-15, BR-18, BR-20, BR-21)
staffQueueRouter.get("/", async (req: Request, res: Response) => {
  const parseResult = staffQueueQuerySchema.safeParse(req.query);

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
    category,
    status,
    priority,
    owner,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = parseResult.data;

  try {
    if (category !== undefined) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: category },
        select: { id: true },
      });

      if (!categoryExists) {
        sendError(res, "INVALID_QUERY_PARAMETER", {
          category: "Category must reference an existing category",
        });
        return;
      }
    }

    const where: Prisma.TicketWhereInput = {};

    // Search matches ticketNumber or summary case-insensitively
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category !== undefined) {
      where.categoryId = category;
    }

    if (status !== undefined) {
      where.status = status;
    }

    if (priority !== undefined) {
      where.itPriority = priority;
    }

    if (owner !== undefined) {
      if (owner === "unassigned") {
        where.ticketOwnerId = null;
      } else if (owner === "me") {
        if (!req.user) {
          sendError(res, "UNAUTHENTICATED");
          return;
        }
        where.ticketOwnerId = req.user.id;
      } else {
        where.ticketOwnerId = parseInt(owner, 10);
      }
    }

    // Sorting always carries id: 'desc' as a stable secondary tiebreak
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
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
          itPriority: true,
          status: true,
          category: {
            select: { id: true, name: true },
          },
          ticketOwner: {
            select: { id: true, name: true },
          },
          requester: {
            select: { id: true, name: true },
          },
          resolvedByRequester: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const items = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      categoryName: t.category.name,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      status: t.status,
      ticketOwner: t.ticketOwner
        ? { id: t.ticketOwner.id, name: t.ticketOwner.name }
        : null,
      requester: {
        id: t.requester.id,
        name: t.requester.name,
      },
      resolvedByRequester: t.resolvedByRequester,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      items,
      pagination: {
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
