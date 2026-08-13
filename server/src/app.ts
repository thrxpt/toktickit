import express from "express";

// The app is built here and started in index.ts, so Supertest can mount it
// without binding a port.
const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// GET /api/categories lands in Issue 4. Unmatched paths fall through to
// Express's default 404, which API-00 asserts.

export default app;
