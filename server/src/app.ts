import express, { type Response } from "express";

import { sendError } from "./errors";
import { prisma } from "./prisma";
import { ticketsRouter } from "./routes/tickets";

// The app is built here and started in index.ts, so Supertest can mount it
// without binding a port.
const app = express();

app.use(express.json());

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
async function sendReferenceData<T>(res: Response, read: () => Promise<T[]>): Promise<void> {
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
  await sendReferenceData(res, () =>
    prisma.requester.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  );
});

// Ticket routes require requester context (BR-04, ADR-0003).
app.use("/api/tickets", ticketsRouter);

// Unmatched paths fall through to Express's default 404, which API-00 asserts.

export default app;
