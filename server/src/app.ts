import express from "express";

// The app is built here and started in index.ts, so Supertest can mount it
// without binding a port.
const app = express();

app.use(express.json());

// Routes land in later Issues: GET /api/health (Issue 2),
// GET /api/categories (Issue 4). Unmatched paths fall through to Express's
// default 404, which API-00 asserts.

export default app;
