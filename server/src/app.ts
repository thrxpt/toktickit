import { actionsTakenRouter } from "./routes/actions-taken";
import cookieParser from "cookie-parser";
import express, { type Response } from "express";

import { sendError } from "./errors";
import { dashboardRouter } from "./dashboard/dashboard.router";
import { requireAuth, requireRole } from "./middleware/auth";
import { prisma } from "./prisma";
import { attachmentsRouter } from "./routes/attachments";
import { authRouter } from "./routes/auth";
import { commentsNotesRouter } from "./routes/comments-notes";
import { ticketsRouter } from "./routes/tickets";
import { usersAdminRouter } from "./admin/users-admin.router";
import { staffQueueRouter } from "./staff/staff-queue.router";
import { staffTicketDetailRouter } from "./staff/staff-ticket-detail.router";

// The app is built here and started in index.ts, so Supertest can mount it
// without binding a port.
const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// Public reference reads return active rows, including an empty collection.
// Database failures share the safe error envelope.
async function sendReferenceData<T>(
  res: Response,
  read: () => Promise<T[]>,
): Promise<void> {
  try {
    res.status(200).json(await read());
  } catch {
    sendError(res, "DATABASE_UNAVAILABLE");
  }
}

app.get("/api/categories", async (_req, res) => {
  // The shape is unchanged from Lab 1 so API-02 keeps passing (D-13); the
  // isActive filter is the only difference (BR-16).
  await sendReferenceData(res, () =>
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    }),
  );
});

app.get("/api/related-systems", async (_req, res) => {
  await sendReferenceData(res, () =>
    prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  );
});

// Authentication routes (Lab 3 foundation).
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);

app.use("/api/tickets", actionsTakenRouter);

// Public Comments & Internal Notes (BR-04, AC-08, AC-14, AC-15).
app.use("/api/tickets", commentsNotesRouter);

// BR-30: Ticket ownership comes only from authenticated Requester sessions.
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);

// Staff routes (Lab 3)
app.use("/api/staff/tickets", staffQueueRouter);
app.use("/api/staff/tickets", staffTicketDetailRouter);

// Administrator User Management (Lab 3)
app.use("/api/admin/users", usersAdminRouter);
app.get(
  "/api/staff/assignees",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (_req, res) => {
    try {
      const assignees = await prisma.user.findMany({
        where: {
          role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      });
      res.status(200).json(assignees);
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);

// Unmatched paths fall through to Express's default 404, which API-00 asserts.

export default app;
