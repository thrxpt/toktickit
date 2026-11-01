import request from "supertest";
import { requesterSession } from "../setup/requester-session";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../setup/test-app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(async () => {
  await truncateTransactionalData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Requester Context — headers never authenticate (Lab 4 BR-30)", () => {
  it.each(["abc", "0", "-1", "-10", "1.5", "null", "undefined"])(
    "responds 401 UNAUTHENTICATED for non-positive-integer header '%s'",
    async (invalidValue) => {
      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", invalidValue)
        .send({ summary: "Test ticket" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: "UNAUTHENTICATED",
          message: expect.any(String),
        },
      });
    },
  );

  it("responds 401 UNAUTHENTICATED when Requester does not exist", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "999999")
      .send({ summary: "Test ticket" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: expect.any(String),
      },
    });
  });
});

describe("Requester Context — requesterId in body rejection (AC-18, BR-04)", () => {
  it("responds 400 REQUESTER_ID_IN_BODY when body contains requesterId", async () => {
    const activeRequester = await prisma.requester.findFirst({
      where: { role: "REQUESTER", mustChangePassword: false, isActive: true },
    });
    expect(activeRequester).not.toBeNull();

    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", await requesterSession(activeRequester!.id))
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
  it("allows requests with a valid active Requester session", async () => {
    const activeRequester = await prisma.requester.findFirst({
      where: { role: "REQUESTER", mustChangePassword: false, isActive: true },
    });
    expect(activeRequester).not.toBeNull();
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });

    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", await requesterSession(activeRequester!.id))
      .send({
        summary: "Valid ticket",
        description: "Valid description of at least ten characters.",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "MEDIUM",
      });

    expect(response.status).toBe(201);
  });

  it("allows public reference routes without X-Requester-Id header", async () => {
    const [healthRes, categoriesRes, systemsRes] = await Promise.all([
      request(app).get("/api/health"),
      request(app).get("/api/categories"),
      request(app).get("/api/related-systems"),
    ]);

    expect(healthRes.status).toBe(200);
    expect(categoriesRes.status).toBe(200);
    expect(systemsRes.status).toBe(200);
  });
});
