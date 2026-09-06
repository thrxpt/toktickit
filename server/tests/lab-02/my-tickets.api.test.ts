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

// Helper to retrieve seeded reference data for test fixtures
async function getTestFixtures() {
  const requesters = await prisma.requester.findMany({
    where: { isActive: true },
    orderBy: { email: "asc" },
  });
  const requesterA = requesters[0]; // e.g. Jennifer Anderson
  const requesterB = requesters[1]; // e.g. Marcus Chen / Somchai Prasert

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const catHardware = categories.find((c) => c.name === "Hardware") ?? categories[0];
  const catSoftware = categories.find((c) => c.name === "Software") ?? categories[1];
  const catAccount = categories.find((c) => c.name === "Account and Access") ?? categories[2];

  const relatedSystems = await prisma.relatedSystem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const systemLaptop = relatedSystems.find((s) => s.name === "Corporate Laptop") ?? relatedSystems[0];
  const systemWifi = relatedSystems.find((s) => s.name === "Campus Wi-Fi") ?? relatedSystems[1];

  return {
    requesterA,
    requesterB,
    catHardware,
    catSoftware,
    catAccount,
    systemLaptop,
    systemWifi,
  };
}

describe("API-09 — 14 owned Tickets, default paging (AC-19)", () => {
  it("responds 200 with 10 rows and truthful meta reporting 14 items across 2 pages", async () => {
    const { requesterA, catHardware, systemLaptop } = await getTestFixtures();

    // Create 14 tickets for Requester A with staggered creation times
    const baseDate = new Date("2026-08-20T10:00:00.000Z");
    for (let i = 1; i <= 14; i++) {
      const padded = String(i).padStart(6, "0");
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${padded}`,
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: `Ticket summary ${i}`,
          description: `Detailed description for ticket ${i}`,
          requestedPriority: "MEDIUM",
          status: "NEW",
          createdAt: new Date(baseDate.getTime() + i * 60000),
        },
      });
    }

    const response = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 14,
      totalPages: 2,
    });

    // Default sorting is newest first (createdAt desc)
    expect(response.body.data[0].ticketNumber).toBe("TKT-2026-000014");
    expect(response.body.data[9].ticketNumber).toBe("TKT-2026-000005");

    // Description is detail-only and must be omitted from list rows
    expect(response.body.data[0].description).toBeUndefined();
    expect(response.body.data[0].category).toEqual({
      id: catHardware.id,
      name: catHardware.name,
    });
    expect(response.body.data[0].relatedSystem).toEqual({
      id: systemLaptop.id,
      name: systemLaptop.name,
    });
  });
});

describe("API-10 — Requester B lists tickets, isolation (AC-20, BR-07)", () => {
  it("ensures Requester A's Tickets are absent from B's list under every parameter combination", async () => {
    const { requesterA, requesterB, catHardware, catSoftware, systemLaptop } =
      await getTestFixtures();

    // Create 3 tickets for Requester A
    for (let i = 1; i <= 3; i++) {
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-00010${i}`,
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: `Requester A issue ${i} Laptop problem`,
          description: `Detailed description for Requester A ticket ${i}`,
          requestedPriority: "HIGH",
          status: "NEW",
          createdAt: new Date(`2026-08-20T10:0${i}:00.000Z`),
        },
      });
    }

    // Create 2 tickets for Requester B
    for (let i = 1; i <= 2; i++) {
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-00020${i}`,
          requesterId: requesterB.id,
          categoryId: catSoftware.id,
          relatedSystemId: systemLaptop.id,
          summary: `Requester B issue ${i} Software bug`,
          description: `Detailed description for Requester B ticket ${i}`,
          requestedPriority: "LOW",
          status: "NEW",
          createdAt: new Date(`2026-08-21T10:0${i}:00.000Z`),
        },
      });
    }

    // 1. Default listing for B
    const resDefault = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterB.id));
    expect(resDefault.status).toBe(200);
    expect(resDefault.body.data).toHaveLength(2);
    expect(resDefault.body.meta.totalItems).toBe(2);
    expect(
      resDefault.body.data.every((t: { ticketNumber: string }) =>
        t.ticketNumber.startsWith("TKT-2026-00020"),
      ),
    ).toBe(true);

    // 2. Search query matching A's tickets ("Laptop")
    const resSearch = await request(app)
      .get("/api/tickets?search=Laptop")
      .set("X-Requester-Id", String(requesterB.id));
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data).toHaveLength(0);
    expect(resSearch.body.meta.totalItems).toBe(0);

    // 3. Search query matching A's ticket number
    const resSearchNum = await request(app)
      .get("/api/tickets?search=TKT-2026-000101")
      .set("X-Requester-Id", String(requesterB.id));
    expect(resSearchNum.status).toBe(200);
    expect(resSearchNum.body.data).toHaveLength(0);
    expect(resSearchNum.body.meta.totalItems).toBe(0);

    // 4. Category filter matching A's category
    const resCat = await request(app)
      .get(`/api/tickets?categoryId=${catHardware.id}`)
      .set("X-Requester-Id", String(requesterB.id));
    expect(resCat.status).toBe(200);
    expect(resCat.body.data).toHaveLength(0);
    expect(resCat.body.meta.totalItems).toBe(0);

    // 5. Priority filter matching A's priority (HIGH)
    const resPrio = await request(app)
      .get("/api/tickets?requestedPriority=HIGH")
      .set("X-Requester-Id", String(requesterB.id));
    expect(resPrio.status).toBe(200);
    expect(resPrio.body.data).toHaveLength(0);
    expect(resPrio.body.meta.totalItems).toBe(0);

    // 6. Sorting
    const resSort = await request(app)
      .get("/api/tickets?sort=ticketNumber&order=asc")
      .set("X-Requester-Id", String(requesterB.id));
    expect(resSort.status).toBe(200);
    expect(resSort.body.data).toHaveLength(2);
    expect(
      resSort.body.data.every((t: { ticketNumber: string }) =>
        t.ticketNumber.startsWith("TKT-2026-00020"),
      ),
    ).toBe(true);
  });
});

describe("API-11 — Search by Ticket Number and Summary substring (AC-21, BR-26)", () => {
  it("searches case-insensitively over Ticket Number and Summary and returns only matches", async () => {
    const { requesterA, catHardware, systemLaptop } = await getTestFixtures();

    await prisma.ticket.createMany({
      data: [
        {
          ticketNumber: "TKT-2026-000001",
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: "VPN connection dropping repeatedly",
          description: "Description 1",
          requestedPriority: "MEDIUM",
          status: "NEW",
        },
        {
          ticketNumber: "TKT-2026-000002",
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: "Monitor flickering at desk 4",
          description: "Description 2",
          requestedPriority: "LOW",
          status: "NEW",
        },
        {
          ticketNumber: "TKT-2026-000003",
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: "Keyboard replacement for laptop",
          description: "Description 3",
          requestedPriority: "HIGH",
          status: "NEW",
        },
      ],
    });

    // Substring match on summary (case-insensitive)
    const resSummary = await request(app)
      .get("/api/tickets?search=fLiCkEr")
      .set("X-Requester-Id", String(requesterA.id));
    expect(resSummary.status).toBe(200);
    expect(resSummary.body.data).toHaveLength(1);
    expect(resSummary.body.data[0].ticketNumber).toBe("TKT-2026-000002");

    // Substring match on ticket number (case-insensitive)
    const resNumber = await request(app)
      .get("/api/tickets?search=tkt-2026-000003")
      .set("X-Requester-Id", String(requesterA.id));
    expect(resNumber.status).toBe(200);
    expect(resNumber.body.data).toHaveLength(1);
    expect(resNumber.body.data[0].summary).toBe("Keyboard replacement for laptop");

    // Partial ticket number
    const resPartial = await request(app)
      .get("/api/tickets?search=000001")
      .set("X-Requester-Id", String(requesterA.id));
    expect(resPartial.status).toBe(200);
    expect(resPartial.body.data).toHaveLength(1);
    expect(resPartial.body.data[0].ticketNumber).toBe("TKT-2026-000001");
  });
});

describe("API-12 — Category filter and combined filters (AC-24, BR-27)", () => {
  it("filters by Category, Priority, and Status with AND combination", async () => {
    const { requesterA, catHardware, catSoftware, catAccount, systemLaptop } =
      await getTestFixtures();

    await prisma.ticket.createMany({
      data: [
        {
          ticketNumber: "TKT-2026-000011",
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: "Hardware High Priority Ticket",
          description: "Desc 1",
          requestedPriority: "HIGH",
          status: "NEW",
        },
        {
          ticketNumber: "TKT-2026-000012",
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: "Hardware Low Priority Ticket",
          description: "Desc 2",
          requestedPriority: "LOW",
          status: "NEW",
        },
        {
          ticketNumber: "TKT-2026-000013",
          requesterId: requesterA.id,
          categoryId: catSoftware.id,
          relatedSystemId: systemLaptop.id,
          summary: "Software High Priority Ticket",
          description: "Desc 3",
          requestedPriority: "HIGH",
          status: "NEW",
        },
        {
          ticketNumber: "TKT-2026-000014",
          requesterId: requesterA.id,
          categoryId: catAccount.id,
          relatedSystemId: systemLaptop.id,
          summary: "Account Medium Priority Ticket",
          description: "Desc 4",
          requestedPriority: "MEDIUM",
          status: "NEW",
        },
      ],
    });

    // 1. Filter by category only
    const resCat = await request(app)
      .get(`/api/tickets?categoryId=${catHardware.id}`)
      .set("X-Requester-Id", String(requesterA.id));
    expect(resCat.status).toBe(200);
    expect(resCat.body.data).toHaveLength(2);
    expect(
      resCat.body.data.every(
        (t: { category: { id: number } }) => t.category.id === catHardware.id,
      ),
    ).toBe(true);

    // 2. Filter by category AND priority AND status
    const resCombined = await request(app)
      .get(
        `/api/tickets?categoryId=${catHardware.id}&requestedPriority=HIGH&status=NEW`,
      )
      .set("X-Requester-Id", String(requesterA.id));
    expect(resCombined.status).toBe(200);
    expect(resCombined.body.data).toHaveLength(1);
    expect(resCombined.body.data[0].ticketNumber).toBe("TKT-2026-000011");

    // 3. Combined filter with search
    const resAll = await request(app)
      .get(
        `/api/tickets?search=High&categoryId=${catSoftware.id}&requestedPriority=HIGH&status=NEW`,
      )
      .set("X-Requester-Id", String(requesterA.id));
    expect(resAll.status).toBe(200);
    expect(resAll.body.data).toHaveLength(1);
    expect(resAll.body.data[0].ticketNumber).toBe("TKT-2026-000013");
  });
});

describe("API-13 — Sorting by ticketNumber and defaults (AC-25, BR-28)", () => {
  it("sorts by ticketNumber ascending and defaults to createdAt desc", async () => {
    const { requesterA, catHardware, systemLaptop } = await getTestFixtures();

    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000003",
        requesterId: requesterA.id,
        categoryId: catHardware.id,
        relatedSystemId: systemLaptop.id,
        summary: "First created, highest number",
        description: "Desc 1",
        requestedPriority: "MEDIUM",
        status: "NEW",
        createdAt: new Date("2026-08-20T10:00:00.000Z"),
      },
    });

    const t2 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000001",
        requesterId: requesterA.id,
        categoryId: catHardware.id,
        relatedSystemId: systemLaptop.id,
        summary: "Second created, lowest number",
        description: "Desc 2",
        requestedPriority: "MEDIUM",
        status: "NEW",
        createdAt: new Date("2026-08-20T11:00:00.000Z"),
      },
    });

    // Default sorting: createdAt desc (t2 then t1)
    const resDefault = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterA.id));
    expect(resDefault.status).toBe(200);
    expect(resDefault.body.data[0].id).toBe(t2.id);
    expect(resDefault.body.data[1].id).toBe(t1.id);

    // Explicit sorting: ticketNumber asc (t2 then t1)
    const resSortNum = await request(app)
      .get("/api/tickets?sort=ticketNumber&order=asc")
      .set("X-Requester-Id", String(requesterA.id));
    expect(resSortNum.status).toBe(200);
    expect(resSortNum.body.data[0].id).toBe(t2.id);
    expect(resSortNum.body.data[1].id).toBe(t1.id);

    // Explicit sorting: ticketNumber desc (t1 then t2)
    const resSortNumDesc = await request(app)
      .get("/api/tickets?sort=ticketNumber&order=desc")
      .set("X-Requester-Id", String(requesterA.id));
    expect(resSortNumDesc.status).toBe(200);
    expect(resSortNumDesc.body.data[0].id).toBe(t1.id);
    expect(resSortNumDesc.body.data[1].id).toBe(t2.id);
  });
});

describe("API-14 — Two Tickets sharing createdAt, stable paging (AC-28, BR-28)", () => {
  it("ensures no duplicate and no gap across pages for tied creation timestamps", async () => {
    const { requesterA, catHardware, systemLaptop } = await getTestFixtures();

    const sharedTimestamp = new Date("2026-08-22T14:00:00.000Z");

    // Create 3 tickets with identical createdAt
    const tickets = [];
    for (let i = 1; i <= 3; i++) {
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-00000${i}`,
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: `Tie ticket ${i}`,
          description: `Desc ${i}`,
          requestedPriority: "LOW",
          status: "NEW",
          createdAt: sharedTimestamp,
        },
      });
      tickets.push(t);
    }

    // Fetch page 1 (pageSize=2)
    const resPage1 = await request(app)
      .get("/api/tickets?page=1&pageSize=10") // we can test with 3 tickets and check secondary sort
      .set("X-Requester-Id", String(requesterA.id));
    expect(resPage1.status).toBe(200);

    // Because secondary sort is id desc, order must be tickets[2], tickets[1], tickets[0]
    expect(resPage1.body.data[0].id).toBe(tickets[2].id);
    expect(resPage1.body.data[1].id).toBe(tickets[1].id);
    expect(resPage1.body.data[2].id).toBe(tickets[0].id);

    // Create 15 tickets total with same createdAt to test pageSize=10 across page 1 and page 2
    for (let i = 4; i <= 15; i++) {
      const padded = String(i).padStart(6, "0");
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${padded}`,
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: `Tie ticket ${i}`,
          description: `Desc ${i}`,
          requestedPriority: "LOW",
          status: "NEW",
          createdAt: sharedTimestamp,
        },
      });
    }

    const p1 = await request(app)
      .get("/api/tickets?page=1&pageSize=10")
      .set("X-Requester-Id", String(requesterA.id));
    expect(p1.status).toBe(200);
    expect(p1.body.data).toHaveLength(10);

    const p2 = await request(app)
      .get("/api/tickets?page=2&pageSize=10")
      .set("X-Requester-Id", String(requesterA.id));
    expect(p2.status).toBe(200);
    expect(p2.body.data).toHaveLength(5);

    const idsPage1 = p1.body.data.map((t: { id: number }) => t.id);
    const idsPage2 = p2.body.data.map((t: { id: number }) => t.id);

    // Check no duplicate across pages
    const intersection = idsPage1.filter((id: number) => idsPage2.includes(id));
    expect(intersection).toHaveLength(0);

    // Check all 15 tickets are present across the 2 pages
    const combined = [...idsPage1, ...idsPage2];
    expect(combined).toHaveLength(15);
    expect(new Set(combined).size).toBe(15);
  });
});

describe("API-15 — Strict parameter validation (AC-26, BR-30)", () => {
  it("responds 400 naming pageSize for pageSize=7 and does not silently clamp", async () => {
    const { requesterA } = await getTestFixtures();

    const response = await request(app)
      .get("/api/tickets?pageSize=7")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_QUERY_PARAMETER",
        message: expect.any(String),
        fields: {
          pageSize: expect.any(String),
        },
      },
    });
  });

  it("responds 400 naming unknown parameter when unexpected query param is passed", async () => {
    const { requesterA } = await getTestFixtures();

    const response = await request(app)
      .get("/api/tickets?unknownParam=xyz")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_QUERY_PARAMETER",
        message: expect.any(String),
        fields: {
          unknownParam: expect.any(String),
        },
      },
    });
  });

  it("responds 400 naming requesterId if requesterId is passed in query string", async () => {
    const { requesterA } = await getTestFixtures();

    const response = await request(app)
      .get("/api/tickets?requesterId=2")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    expect(response.body.error.fields.requesterId).toBeDefined();
  });

  it("responds 400 for search exceeding 150 characters", async () => {
    const { requesterA } = await getTestFixtures();
    const longSearch = "a".repeat(151);

    const response = await request(app)
      .get(`/api/tickets?search=${longSearch}`)
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    expect(response.body.error.fields.search).toBeDefined();
  });

  it("responds 400 for invalid page value (0, negative, non-integer)", async () => {
    const { requesterA } = await getTestFixtures();

    const response = await request(app)
      .get("/api/tickets?page=0")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    expect(response.body.error.fields.page).toBeDefined();
  });

  it("responds 400 for unknown categoryId", async () => {
    const { requesterA } = await getTestFixtures();

    const response = await request(app)
      .get("/api/tickets?categoryId=999999")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    expect(response.body.error.fields.categoryId).toBeDefined();
  });

  it("responds 400 for invalid requestedPriority", async () => {
    const { requesterA } = await getTestFixtures();

    const response = await request(app)
      .get("/api/tickets?requestedPriority=URGENT")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    expect(response.body.error.fields.requestedPriority).toBeDefined();
  });
});

describe("API-16 — Page beyond the last (AC-27, BR-29)", () => {
  it("responds 200 with empty data and truthful meta when page exceeds totalPages", async () => {
    const { requesterA, catHardware, systemLaptop } = await getTestFixtures();

    // Create 3 tickets
    for (let i = 1; i <= 3; i++) {
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-00000${i}`,
          requesterId: requesterA.id,
          categoryId: catHardware.id,
          relatedSystemId: systemLaptop.id,
          summary: `Ticket ${i}`,
          description: `Desc ${i}`,
          requestedPriority: "MEDIUM",
          status: "NEW",
        },
      });
    }

    // Page 5 with pageSize 10 when only 3 items exist
    const response = await request(app)
      .get("/api/tickets?page=5&pageSize=10")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({
      page: 5,
      pageSize: 10,
      totalItems: 3,
      totalPages: 1,
    });
  });

  it("responds 200 with empty data and totalPages=0 when no tickets exist at all", async () => {
    const { requesterA } = await getTestFixtures();

    const response = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterA.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
  });
});
