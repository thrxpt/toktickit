import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../setup/test-app";

describe("API-01 — GET /api/health", () => {
  it("returns 200 with status ok and the service name", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "TokTickIT API" });
  });
});
