import express from "express";

import { sendError } from "./errors";
import { prisma } from "./prisma";

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
// An empty array is a valid 200 that drives the client's empty state (AC-07),
// never an error.

app.get("/api/categories", async (_req, res) => {
  try {
    // The shape is unchanged from Lab 1 so API-02 keeps passing (D-13); the
    // isActive filter is the only difference (BR-16).
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });

    res.status(200).json(categories);
  } catch {
    sendError(res, 500, "DATABASE_UNAVAILABLE");
  }
});

app.get("/api/related-systems", async (_req, res) => {
  try {
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    res.status(200).json(relatedSystems);
  } catch {
    sendError(res, 500, "DATABASE_UNAVAILABLE");
  }
});

app.get("/api/requesters", async (_req, res) => {
  try {
    // Inactive Requesters never appear (BR-05): the selector must never offer
    // an identity the API would reject the moment it was used.
    const requesters = await prisma.requester.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });

    res.status(200).json(requesters);
  } catch {
    sendError(res, 500, "DATABASE_UNAVAILABLE");
  }
});

// Unmatched paths fall through to Express's default 404, which API-00 asserts.

export default app;
