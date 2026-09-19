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

async function loginAs(email: string, password = "Password123!") {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  expect(res.status).toBe(200);
  const cookieHeader = res.headers["set-cookie"];
  const sessionCookie = Array.isArray(cookieHeader)
    ? cookieHeader.find((c) => c.startsWith("toktickit_session="))
    : cookieHeader;
  return {
    user: res.body.user,
    token: res.body.token as string,
    cookie: sessionCookie as string,
  };
}

async function createTestTicket(data: {
  ticketNumber: string;
  summary: string;
  description?: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
  itPriority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status?:
    | "NEW"
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_FOR_REQUESTER"
    | "RESOLVED"
    | "CLOSED"
    | "REOPENED"
    | "CANCELLED";
  ticketOwnerId?: number | null;
  resolvedByRequester?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return prisma.ticket.create({
    data: {
      ticketNumber: data.ticketNumber,
      summary: data.summary,
      description: data.description ?? "Test description for " + data.summary,
      requesterId: data.requesterId,
      categoryId: data.categoryId,
      relatedSystemId: data.relatedSystemId,
      requestedPriority: data.requestedPriority ?? "MEDIUM",
      itPriority: data.itPriority ?? "MEDIUM",
      status: data.status ?? "NEW",
      ticketOwnerId: data.ticketOwnerId ?? null,
      resolvedByRequester: data.resolvedByRequester ?? false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  });
}

describe("API-10 — IT Staff queries Ticket Queue with filters and pagination (AC-10, FR-09)", () => {
  it("responds 200 OK with empty queue and truthful pagination when no tickets exist", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
    });
  });

  it("returns tickets with the exact contract schema matching api-spec.md", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true },
    });
    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
    });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
    });

    const ticket = await createTestTicket({
      ticketNumber: "TKT-2026-000001",
      summary: "Keyboard not responding",
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      requestedPriority: "MEDIUM",
      itPriority: "HIGH",
      status: "IN_PROGRESS",
      ticketOwnerId: staff.user.id,
      resolvedByRequester: false,
    });

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual({
      id: ticket.id,
      ticketNumber: "TKT-2026-000001",
      summary: "Keyboard not responding",
      categoryName: category.name,
      requestedPriority: "MEDIUM",
      itPriority: "HIGH",
      status: "IN_PROGRESS",
      ticketOwner: {
        id: staff.user.id,
        name: staff.user.name,
      },
      requester: {
        id: requester.id,
        name: requester.name,
      },
      resolvedByRequester: false,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("returns ticketOwner: null for unassigned tickets", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true },
    });
    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
    });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
    });

    await createTestTicket({
      ticketNumber: "TKT-2026-000002",
      summary: "Unassigned printer issue",
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      ticketOwnerId: null,
    });

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(200);
    expect(res.body.items[0].ticketOwner).toBeNull();
  });

  it("allows Administrator to query the ticket queue with 200 OK", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", admin.cookie);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });

  describe("search filter", () => {
    it("filters tickets by substring in ticketNumber (case-insensitive)", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000100",
        summary: "First ticket",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000200",
        summary: "Second ticket",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get("/api/staff/tickets?search=000100")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].ticketNumber).toBe("TKT-2026-000100");
    });

    it("filters tickets by substring in summary (case-insensitive)", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000003",
        summary: "MacBook Trackpad not clicking",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000004",
        summary: "Dell display flickering",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get("/api/staff/tickets?search=trackpad")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].summary).toBe("MacBook Trackpad not clicking");
    });
  });

  describe("category, status, and priority filters", () => {
    it("filters tickets by category ID", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        take: 2,
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000010",
        summary: "Category A ticket",
        requesterId: requester.id,
        categoryId: categories[0].id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000011",
        summary: "Category B ticket",
        requesterId: requester.id,
        categoryId: categories[1].id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get(`/api/staff/tickets?category=${categories[0].id}`)
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].categoryName).toBe(categories[0].name);
    });

    it("filters tickets by status", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000020",
        summary: "New ticket",
        status: "NEW",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000021",
        summary: "In progress ticket",
        status: "IN_PROGRESS",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get("/api/staff/tickets?status=IN_PROGRESS")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe("IN_PROGRESS");
    });

    it("filters tickets by itPriority", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000030",
        summary: "Low priority ticket",
        itPriority: "LOW",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000031",
        summary: "Critical priority ticket",
        itPriority: "CRITICAL",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get("/api/staff/tickets?priority=CRITICAL")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].itPriority).toBe("CRITICAL");
    });
  });

  describe("owner filter", () => {
    it("filters by unassigned owner", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000040",
        summary: "Assigned ticket",
        ticketOwnerId: staff.user.id,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000041",
        summary: "Unassigned ticket",
        ticketOwnerId: null,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get("/api/staff/tickets?owner=unassigned")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].ticketNumber).toBe("TKT-2026-000041");
      expect(res.body.items[0].ticketOwner).toBeNull();
    });

    it("filters by 'me' (assigned to the authenticated caller)", async () => {
      const staffA = await loginAs("michael.brown@toktickit.com");
      const staffB = await loginAs("sarah.johnson@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000050",
        summary: "Staff A ticket",
        ticketOwnerId: staffA.user.id,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000051",
        summary: "Staff B ticket",
        ticketOwnerId: staffB.user.id,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get("/api/staff/tickets?owner=me")
        .set("Cookie", staffA.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].ticketNumber).toBe("TKT-2026-000050");
      expect(res.body.items[0].ticketOwner.id).toBe(staffA.user.id);
    });

    it("filters by specific staff user ID", async () => {
      const staffA = await loginAs("michael.brown@toktickit.com");
      const staffB = await loginAs("sarah.johnson@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      await createTestTicket({
        ticketNumber: "TKT-2026-000060",
        summary: "Staff B ticket",
        ticketOwnerId: staffB.user.id,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const res = await request(app)
        .get(`/api/staff/tickets?owner=${staffB.user.id}`)
        .set("Cookie", staffA.cookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].ticketOwner.id).toBe(staffB.user.id);
    });
  });

  describe("sorting and pagination", () => {
    it("sorts by createdAt asc and desc with stable secondary id:desc tiebreak", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      const now = Date.now();
      await createTestTicket({
        ticketNumber: "TKT-2026-000070",
        summary: "Older ticket",
        createdAt: new Date(now - 100000),
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });
      await createTestTicket({
        ticketNumber: "TKT-2026-000071",
        summary: "Newer ticket",
        createdAt: new Date(now),
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      });

      const descRes = await request(app)
        .get("/api/staff/tickets?sortBy=createdAt&sortOrder=desc")
        .set("Cookie", staff.cookie);
      expect(descRes.status).toBe(200);
      expect(descRes.body.items[0].ticketNumber).toBe("TKT-2026-000071");

      const ascRes = await request(app)
        .get("/api/staff/tickets?sortBy=createdAt&sortOrder=asc")
        .set("Cookie", staff.cookie);
      expect(ascRes.status).toBe(200);
      expect(ascRes.body.items[0].ticketNumber).toBe("TKT-2026-000070");
    });

    it("paginates correctly across multiple pages with page and pageSize", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");
      const requester = await prisma.user.findFirstOrThrow({
        where: { role: "REQUESTER", isActive: true },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
        where: { isActive: true },
      });

      // Create 12 tickets
      for (let i = 1; i <= 12; i++) {
        const num = String(i).padStart(6, "0");
        await createTestTicket({
          ticketNumber: `TKT-2026-${num}`,
          summary: `Ticket #${i}`,
          requesterId: requester.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
        });
      }

      const page1Res = await request(app)
        .get("/api/staff/tickets?page=1&pageSize=10")
        .set("Cookie", staff.cookie);
      expect(page1Res.status).toBe(200);
      expect(page1Res.body.items).toHaveLength(10);
      expect(page1Res.body.pagination).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 12,
        totalPages: 2,
      });

      const page2Res = await request(app)
        .get("/api/staff/tickets?page=2&pageSize=10")
        .set("Cookie", staff.cookie);
      expect(page2Res.status).toBe(200);
      expect(page2Res.body.items).toHaveLength(2);
      expect(page2Res.body.pagination).toEqual({
        page: 2,
        pageSize: 10,
        totalItems: 12,
        totalPages: 2,
      });
    });
  });

  describe("query validation errors", () => {
    it("rejects non-existent category with 400 INVALID_QUERY_PARAMETER", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");

      const res = await request(app)
        .get("/api/staff/tickets?category=99999")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects invalid status enum with 400 INVALID_QUERY_PARAMETER", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");

      const res = await request(app)
        .get("/api/staff/tickets?status=BOGUS")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects invalid priority enum with 400 INVALID_QUERY_PARAMETER", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");

      const res = await request(app)
        .get("/api/staff/tickets?priority=URGENT")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects invalid owner value with 400 INVALID_QUERY_PARAMETER", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");

      const res = await request(app)
        .get("/api/staff/tickets?owner=invalid_owner")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects unrecognized query parameters with 400 INVALID_QUERY_PARAMETER", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");

      const res = await request(app)
        .get("/api/staff/tickets?foo=bar")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });
  });

  describe("GET /api/staff/assignees", () => {
    it("returns list of active staff and admin members", async () => {
      const staff = await loginAs("michael.brown@toktickit.com");

      const res = await request(app)
        .get("/api/staff/assignees")
        .set("Cookie", staff.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        role: expect.stringMatching(/^(IT_STAFF|ADMINISTRATOR)$/),
      });
    });
  });
});
