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

describe("Create Ticket API", () => {
  async function getActiveContext() {
    const requester = await prisma.requester.findFirstOrThrow({
      where: { isActive: true },
    });
    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
    });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
    });
    return { requester, category, relatedSystem };
  }

  describe("API-01 — Create a valid Ticket (AC-08, AC-09)", () => {
    it("responds 201, sets Location, stores row with status NEW and requesterId from header", async () => {
      const { requester, category, relatedSystem } = await getActiveContext();

      const payload = {
        summary: "Laptop battery drains quickly",
        description: "My laptop battery is draining much faster than usual even when idle.",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "MEDIUM",
      };

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.header.location).toBe(`/api/tickets/${response.body.id}`);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
        summary: "Laptop battery drains quickly",
        description: "My laptop battery is draining much faster than usual even when idle.",
        requestedPriority: "MEDIUM",
        status: "NEW",
        category: { id: category.id, name: category.name },
        relatedSystem: { id: relatedSystem.id, name: relatedSystem.name },
        requester: { id: requester.id, name: requester.name },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify row in database (AC-09)
      const tickets = await prisma.ticket.findMany();
      expect(tickets).toHaveLength(1);
      expect(tickets[0].requesterId).toBe(requester.id);
      expect(tickets[0].status).toBe("NEW");
      expect(tickets[0].ticketNumber).toBe(response.body.ticketNumber);
    });
  });

  describe("API-02 — Two successive creations (AC-10)", () => {
    it("generates distinct, well-formed Ticket Numbers for successive creations", async () => {
      const { requester, category, relatedSystem } = await getActiveContext();

      const payload = {
        summary: "First ticket report",
        description: "Detailed description of the first issue reported.",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      };

      const res1 = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send(payload);

      const res2 = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send({
          ...payload,
          summary: "Second ticket report",
          description: "Detailed description of the second issue reported.",
        });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);

      expect(res1.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(res2.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(res1.body.ticketNumber).not.toBe(res2.body.ticketNumber);
    });
  });

  describe("API-03 — Summary over 150 chars (AC-13, BR-20)", () => {
    it("responds 400 VALIDATION_FAILED naming summary when summary exceeds 150 chars", async () => {
      const { requester, category, relatedSystem } = await getActiveContext();

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send({
          summary: "a".repeat(151),
          description: "Valid description of at least ten characters.",
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "MEDIUM",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "VALIDATION_FAILED",
          message: expect.any(String),
          fields: {
            summary: expect.any(String),
          },
        },
      });
    });
  });

  describe("API-04 — Missing Category or Related System (AC-14)", () => {
    it("responds 400 naming categoryId when categoryId is omitted", async () => {
      const { requester, relatedSystem } = await getActiveContext();

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send({
          summary: "Valid summary",
          description: "Valid description of at least ten characters.",
          relatedSystemId: relatedSystem.id,
          requestedPriority: "MEDIUM",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "VALIDATION_FAILED",
          message: expect.any(String),
          fields: {
            categoryId: expect.any(String),
          },
        },
      });
    });

    it("responds 400 naming relatedSystemId when relatedSystemId is omitted", async () => {
      const { requester, category } = await getActiveContext();

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send({
          summary: "Valid summary",
          description: "Valid description of at least ten characters.",
          categoryId: category.id,
          requestedPriority: "MEDIUM",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "VALIDATION_FAILED",
          message: expect.any(String),
          fields: {
            relatedSystemId: expect.any(String),
          },
        },
      });
    });
  });

  describe("API-05 — Inactive Category referenced (AC-15, BR-16)", () => {
    it("responds 400 and creates no Ticket when category is inactive", async () => {
      const { requester, relatedSystem } = await getActiveContext();
      const inactiveCategory = await prisma.category.findFirstOrThrow({
        where: { isActive: false },
      });

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send({
          summary: "Valid summary",
          description: "Valid description of at least ten characters.",
          categoryId: inactiveCategory.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "HIGH",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "VALIDATION_FAILED",
          message: expect.any(String),
          fields: {
            categoryId: expect.any(String),
          },
        },
      });

      // Assert no Ticket was created
      const count = await prisma.ticket.count();
      expect(count).toBe(0);
    });

    it("responds 400 and creates no Ticket when relatedSystem is inactive", async () => {
      const { requester, category } = await getActiveContext();
      const inactiveSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: false },
      });

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requester.id))
        .send({
          summary: "Valid summary",
          description: "Valid description of at least ten characters.",
          categoryId: category.id,
          relatedSystemId: inactiveSystem.id,
          requestedPriority: "HIGH",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "VALIDATION_FAILED",
          message: expect.any(String),
          fields: {
            relatedSystemId: expect.any(String),
          },
        },
      });

      // Assert no Ticket was created
      const count = await prisma.ticket.count();
      expect(count).toBe(0);
    });
  });

  describe("API-06 — requesterId in body rejection (AC-18, BR-04)", () => {
    it("responds 400 REQUESTER_ID_IN_BODY and creates no Ticket when requesterId is in body", async () => {
      const activeRequesters = await prisma.requester.findMany({
        where: { isActive: true },
        take: 2,
      });
      const requesterA = activeRequesters[0];
      const requesterB = activeRequesters[1];
      const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requesterA.id))
        .send({
          summary: "Valid summary",
          description: "Valid description of at least ten characters.",
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "MEDIUM",
          requesterId: requesterB.id,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "REQUESTER_ID_IN_BODY",
          message: expect.any(String),
        },
      });

      // Neither requester owns a ticket
      expect(await prisma.ticket.count()).toBe(0);
    });
  });

  describe("API-07 — Missing X-Requester-Id (BR-04)", () => {
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

  describe("API-08 — Header naming an inactive Requester (AC-05, BR-05)", () => {
    it("responds 400 REQUESTER_INACTIVE when header names an inactive Requester", async () => {
      const inactiveRequester = await prisma.requester.findFirstOrThrow({
        where: { isActive: false },
      });

      const response = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(inactiveRequester.id))
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
});
