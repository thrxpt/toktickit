import cookieParser from "cookie-parser";
import express, { type Response } from "express";

import { sendError } from "./errors";
import { requireAuth, requireRole } from "./middleware/auth";
import { prisma } from "./prisma";
import { attachmentsRouter } from "./routes/attachments";
import { authRouter } from "./routes/auth";
import { commentsNotesRouter } from "./routes/comments-notes";
import { ticketsRouter } from "./routes/tickets";
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

// The three reference reads. None requires a Development Requester context
// (api-spec.md, "Requester context") — /api/requesters is the route that
// establishes it. All three return active rows only, because reference data
// belongs to the server and is never hard-coded in the client (BR-45).
//
// They differ only in what they read, so the response and the failure they
// share live here: an empty array is a valid 200 that drives the client's
// empty state (AC-07), never an error, and an unreachable database is the one
// failure any of them can have.
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

app.get("/api/requesters", async (_req, res) => {
  // Inactive Requesters never appear (BR-05): the selector must never offer
  // an identity the API would reject the moment it was used.
  // Role is restricted to REQUESTER.
  await sendReferenceData(res, () =>
    prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  );
});

// Authentication routes (Lab 3 foundation).
app.use("/api/auth", authRouter);

// Public Comments & Internal Notes (BR-04, AC-08, AC-14, AC-15).
app.use("/api/tickets", commentsNotesRouter);

// Ticket routes require requester context (BR-04, ADR-0003).
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);

// Staff routes (Lab 3)
app.use("/api/staff/tickets", staffQueueRouter);
app.use("/api/staff/tickets", staffTicketDetailRouter);
app.get(
  "/api/staff/assignees",
  requireAuth,
  requireRole("IT_STAFF"),
  async (_req, res) => {
    try {
      const staff = await prisma.user.findMany({
        where: {
          role: "IT_STAFF",
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      });
      res.status(200).json(staff);
    } catch {
      sendError(res, "DATABASE_UNAVAILABLE");
    }
  },
);

// Unmatched paths fall through to Express's default 404, which API-00 asserts.

export default app;
