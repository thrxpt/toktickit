import express, { type Request, type Response } from "express";

import {
  createCommentSchema,
  createInternalNoteSchema,
} from "../comments/comment-schema";
import { formatZodErrors, sendError } from "../errors";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";

export const commentsNotesRouter = express.Router();

function parseTicketId(param: string | string[] | undefined): number | null {
  if (typeof param !== "string") {
    return null;
  }
  if (!/^[1-9]\d*$/.test(param)) {
    return null;
  }
  const parsed = parseInt(param, 10);
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) {
    return null;
  }
  return parsed;
}

// GET /api/tickets/:id/comments (FR-07, FR-10, FR-14, BR-04, BR-26, BR-28, AC-14)
commentsNotesRouter.get("/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  const ticketId = parseTicketId(req.params.id);
  if (ticketId === null) {
    sendError(res, "TICKET_NOT_FOUND");
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    // Requester can only read comments on tickets they own (BR-04, BR-16, ADR-0005)
    if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    const comments = await prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json(
      comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.author.id,
          name: comment.author.name,
          role: comment.author.role,
        },
      })),
    );
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

// POST /api/tickets/:id/comments (FR-07, FR-14, BR-04, BR-25, BR-26, BR-27, AC-14)
commentsNotesRouter.post("/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  const ticketId = parseTicketId(req.params.id);
  if (ticketId === null) {
    sendError(res, "TICKET_NOT_FOUND");
    return;
  }

  const parseResult = createCommentSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, "VALIDATION_FAILED", formatZodErrors(parseResult.error));
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    // Requester can only post comments on tickets they own (BR-04, BR-16, ADR-0005)
    if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId,
        authorId: user.id,
        content: parseResult.data.content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.author.id,
        name: comment.author.name,
        role: comment.author.role,
      },
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

// GET /api/tickets/:id/notes (FR-10, BR-04, BR-17, BR-26, BR-28, AC-08, AC-15)
commentsNotesRouter.get("/:id/notes", requireAuth, async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  // Strictly restricted to IT_STAFF and ADMINISTRATOR (BR-04, BR-17, AC-08)
  if (user.role === "REQUESTER") {
    sendError(res, "FORBIDDEN");
    return;
  }

  const ticketId = parseTicketId(req.params.id);
  if (ticketId === null) {
    sendError(res, "TICKET_NOT_FOUND");
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json(
      notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        author: {
          id: note.author.id,
          name: note.author.name,
          role: note.author.role,
        },
      })),
    );
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});

// POST /api/tickets/:id/notes (FR-14, BR-04, BR-17, BR-25, BR-26, BR-27, AC-08, AC-15)
commentsNotesRouter.post("/:id/notes", requireAuth, async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    sendError(res, "UNAUTHENTICATED");
    return;
  }

  // Strictly restricted to IT_STAFF and ADMINISTRATOR (BR-04, BR-17, AC-08)
  if (user.role === "REQUESTER") {
    sendError(res, "FORBIDDEN");
    return;
  }

  const ticketId = parseTicketId(req.params.id);
  if (ticketId === null) {
    sendError(res, "TICKET_NOT_FOUND");
    return;
  }

  const parseResult = createInternalNoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendError(res, "VALIDATION_FAILED", formatZodErrors(parseResult.error));
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      sendError(res, "TICKET_NOT_FOUND");
      return;
    }

    const note = await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: user.id,
        content: parseResult.data.content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: {
        id: note.author.id,
        name: note.author.name,
        role: note.author.role,
      },
    });
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
});
