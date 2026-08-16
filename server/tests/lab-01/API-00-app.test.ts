import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app";

// API-00 proves the Supertest harness and the app/server split, without
// touching GET /api/health — that endpoint and API-01 belong to Issue 2.
describe("API-00 — Express app boots under Supertest", () => {
  it("responds 404 to an unknown path", async () => {
    const response = await request(app).get("/definitely-not-a-route");

    expect(response.status).toBe(404);
  });
});
