import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(async () => {
  await truncateTransactionalData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API-07 — missing X-Requester-Id (BR-04)", () => {
  it("responds 400 REQUESTER_CONTEXT_MISSING when header is omitted", async () => {
    const response = await request(app).post("/api/tickets").send({ summary: "Test ticket" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "REQUESTER_CONTEXT_MISSING",
        message: expect.any(String),
      },
    });
  });

  it("responds 400 REQUESTER_CONTEXT_MISSING when header is empty string", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "")
      .send({ summary: "Test ticket" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "REQUESTER_CONTEXT_MISSING",
        message: expect.any(String),
      },
    });
  });
});

describe("API-08 — inactive Requester in X-Requester-Id (AC-05, BR-05)", () => {
  it("responds 400 REQUESTER_INACTIVE when header names an inactive Requester", async () => {
    const inactiveRequester = await prisma.requester.findFirst({
      where: { isActive: false },
    });
    expect(inactiveRequester).not.toBeNull();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(inactiveRequester!.id))
      .send({ summary: "Test ticket" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "REQUESTER_INACTIVE",
        message: expect.any(String),
      },
    });
  });
});

describe("Requester Context — malformed and unknown header (BR-05, ADR-0005)", () => {
  it.each(["abc", "0", "-1", "-10", "1.5", "null", "undefined"])(
    "responds 400 REQUESTER_CONTEXT_INVALID for non-positive-integer header '%s'",
    async (invalidValue) => {
      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", invalidValue)
        .send({ summary: "Test ticket" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "REQUESTER_CONTEXT_INVALID",
          message: expect.any(String),
        },
      });
    },
  );

  it("responds 400 REQUESTER_CONTEXT_INVALID when Requester does not exist", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "999999")
      .send({ summary: "Test ticket" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "REQUESTER_CONTEXT_INVALID",
        message: expect.any(String),
      },
    });
  });
});

describe("Requester Context — requesterId in body rejection (AC-18, BR-04)", () => {
  it("responds 400 REQUESTER_ID_IN_BODY when body contains requesterId", async () => {
    const activeRequester = await prisma.requester.findFirst({
      where: { isActive: true },
    });
    expect(activeRequester).not.toBeNull();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(activeRequester!.id))
      .send({
        summary: "Test ticket",
        requesterId: activeRequester!.id,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "REQUESTER_ID_IN_BODY",
        message: expect.any(String),
      },
    });
  });
});

describe("Requester Context — happy path and public routes", () => {
  it("allows requests with valid active Requester header", async () => {
    const activeRequester = await prisma.requester.findFirst({
      where: { isActive: true },
    });
    expect(activeRequester).not.toBeNull();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(activeRequester!.id))
      .send({ summary: "Valid ticket" });

    expect(response.status).toBe(201);
  });

  it("allows public reference routes without X-Requester-Id header", async () => {
    const [healthRes, categoriesRes, systemsRes, requestersRes] = await Promise.all([
      request(app).get("/api/health"),
      request(app).get("/api/categories"),
      request(app).get("/api/related-systems"),
      request(app).get("/api/requesters"),
    ]);

    expect(healthRes.status).toBe(200);
    expect(categoriesRes.status).toBe(200);
    expect(systemsRes.status).toBe(200);
    expect(requestersRes.status).toBe(200);
  });
});
