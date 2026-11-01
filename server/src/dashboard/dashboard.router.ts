import express from "express";
import { sendError } from "../errors";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../prisma";

import { STATUS_GROUPS } from "./status-groups";
const recentSelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  status: true,
  itPriority: true,
  updatedAt: true,
} as const;
const recentOrder = [{ updatedAt: "desc" }, { id: "desc" }] as const;
export const dashboardRouter = express.Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get(
  "/requester",
  requireRole("REQUESTER"),
  async (req, res) => {
    const where = { requesterId: req.user!.id };
    try {
      const [
        openTickets,
        waitingForRequester,
        recentlyUpdated,
        recentlyResolved,
      ] = await prisma.$transaction([
        prisma.ticket.count({
          where: { ...where, status: { in: [...STATUS_GROUPS.open] } },
        }),
        prisma.ticket.count({
          where: { ...where, status: "WAITING_FOR_REQUESTER" },
        }),
        prisma.ticket.findMany({
          where,
          select: recentSelect,
          orderBy: [...recentOrder],
          take: 5,
        }),
        prisma.ticket.findMany({
          where: { ...where, status: { in: [...STATUS_GROUPS.resolved] } },
          select: recentSelect,
          orderBy: [...recentOrder],
          take: 5,
        }),
      ]);
      res.json({
        openTickets,
        waitingForRequester,
        recentlyUpdated,
        recentlyResolved,
      });
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);

dashboardRouter.get(
  "/staff",
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req, res) => {
    try {
      const [unassigned, ownedByMe, statuses, priorities, recent] =
        await prisma.$transaction([
          prisma.ticket.count({ where: { ticketOwnerId: null } }),
          prisma.ticket.count({ where: { ticketOwnerId: req.user!.id } }),
          prisma.ticket.groupBy({ by: ["status"], _count: true }),
          prisma.ticket.groupBy({ by: ["itPriority"], _count: true }),
          prisma.ticket.findMany({
            select: {
              ...recentSelect,
              ticketOwner: { select: { id: true, name: true } },
            },
            orderBy: [...recentOrder],
            take: 5,
          }),
        ]);
      const byStatus = {
        NEW: 0,
        OPEN: 0,
        IN_PROGRESS: 0,
        WAITING_FOR_REQUESTER: 0,
        RESOLVED: 0,
        CLOSED: 0,
        REOPENED: 0,
        CANCELLED: 0,
      };
      const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      for (const row of statuses) byStatus[row.status] = row._count;
      for (const row of priorities) byPriority[row.itPriority] = row._count;
      const metrics = {
        unassigned,
        ownedByMe,
        byStatus,
        byPriority,
        recentlyUpdated: recent.map(({ ticketOwner, ...ticket }) => ({
          ...ticket,
          owner: ticketOwner,
        })),
      };
      if (req.user!.role !== "ADMINISTRATOR") {
        res.json(metrics);
        return;
      }
      // FR-14: account failure must not make the operational metrics unusable.
      try {
        const [roles, active, inactive] = await prisma.$transaction([
          prisma.user.groupBy({ by: ["role"], _count: true }),
          prisma.user.count({ where: { isActive: true } }),
          prisma.user.count({ where: { isActive: false } }),
        ]);
        const byRole = { REQUESTER: 0, IT_STAFF: 0, ADMINISTRATOR: 0 };
        for (const row of roles) byRole[row.role] = row._count;
        res.json({
          ...metrics,
          userCounts: { total: active + inactive, active, inactive, byRole },
        });
      } catch {
        res.json(metrics);
      }
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);
