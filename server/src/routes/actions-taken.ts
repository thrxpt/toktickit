import express from "express";
import { createActionSchema, updateActionSchema, validFollowUp } from "../actions/action-schema";
import { formatZodErrors, sendError } from "../errors";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../prisma";
import { parseTicketId } from "../tickets/parse-ticket-id";

export const actionsTakenRouter = express.Router();
const actionSelect = {
  id: true, ticketId: true, description: true, result: true,
  followUpRequired: true, followUpNote: true, attachmentNotes: true,
  createdAt: true, updatedAt: true,
  performedBy: { select: { id: true, name: true, role: true } },
} as const;

actionsTakenRouter.get("/:id/actions", requireAuth, async (req, res) => {
  const ticketId = parseTicketId(req.params.id);
  if (ticketId === null) { sendError(res, "TICKET_NOT_FOUND"); return; }
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    // BR-09: conceal existence from an unrelated Requester.
    if (!ticket || (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id)) {
      sendError(res, "TICKET_NOT_FOUND"); return;
    }
    res.json(await prisma.actionTaken.findMany({
      where: { ticketId }, select: actionSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }));
  } catch { sendError(res, "DATABASE_UNAVAILABLE"); }
});

// BR-12: conditional Ticket update and action write commit or roll back together.
for (const method of ["post", "patch"] as const) {
  actionsTakenRouter[method](method === "post" ? "/:id/actions" : "/:id/actions/:actionId",
    requireAuth, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req, res) => {
      const ticketId = parseTicketId(req.params.id);
      if (ticketId === null) { sendError(res, "TICKET_NOT_FOUND"); return; }
      const parsed = (method === "post" ? createActionSchema : updateActionSchema).safeParse(req.body);
      if (!parsed.success) { sendError(res, "VALIDATION_FAILED", formatZodErrors(parsed.error)); return; }
      try {
        const outcome = await prisma.$transaction(async tx => {
          const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
          if (!ticket) return { error: "TICKET_NOT_FOUND" } as const;
          const actionId = parseTicketId(req.params.actionId);
          const existing = method === "patch" && actionId !== null
            ? await tx.actionTaken.findFirst({ where: { id: actionId, ticketId } }) : null;
          if (method === "patch" && !existing) return { error: "ACTION_TAKEN_NOT_FOUND" } as const;
          const { expectedVersion, ...fields } = parsed.data;
          const followUpRequired = fields.followUpRequired ?? existing?.followUpRequired ?? false;
          const followUpNote = fields.followUpRequired === false ? fields.followUpNote ?? null
            : fields.followUpNote === undefined ? existing?.followUpNote ?? null : fields.followUpNote;
          if (!validFollowUp(followUpRequired, followUpNote)) return { error: "VALIDATION_FAILED" } as const;
          const changed = await tx.ticket.updateMany({
            where: { id: ticketId, version: expectedVersion }, data: { version: { increment: 1 } },
          });
          if (changed.count === 0) return { error: "STALE_UPDATE" } as const;
          const data = { ...fields, followUpRequired, followUpNote: followUpNote || null,
            attachmentNotes: fields.attachmentNotes === undefined ? existing?.attachmentNotes ?? null : fields.attachmentNotes || null };
          const action = existing
            ? await tx.actionTaken.update({ where: { id: existing.id }, data, select: actionSelect })
            : await tx.actionTaken.create({ data: { ...data, ticketId, performedById: req.user!.id }, select: actionSelect });
          return { action, ticketVersion: expectedVersion + 1 };
        });
        if ("error" in outcome) {
          sendError(res, outcome.error!, outcome.error === "VALIDATION_FAILED"
            ? { followUpNote: "Supply a follow-up note exactly when follow-up is required." } : undefined);
          return;
        }
        res.status(method === "post" ? 201 : 200).json(outcome);
      } catch { sendError(res, "DATABASE_UNAVAILABLE"); }
    });
}
