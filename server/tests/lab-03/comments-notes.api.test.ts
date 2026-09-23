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

async function getActiveFixtures() {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { isActive: true } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  return { category, relatedSystem };
}

describe("API-14 — Post and get Public Comments on Ticket (AC-14, BR-04)", () => {
  it("allows Requester, IT Staff, and Admin to post and view public comments in chronological order", async () => {
    const requesterA = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const admin = await loginAs("admin@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    // Requester A creates a ticket
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterA.cookie)
      .send({
        summary: "Public Comments Discussion Ticket",
        description: "Checking that two-tier comments work properly",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "MEDIUM",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // 1. Requester posts a public comment
    const comment1Res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requesterA.cookie)
      .send({ content: "  Could you please look into this today?  " });

    expect(comment1Res.status).toBe(201);
    expect(comment1Res.body).toMatchObject({
      id: expect.any(Number),
      content: "Could you please look into this today?", // trimmed per BR-27
      createdAt: expect.any(String),
      author: {
        id: requesterA.user.id,
        name: requesterA.user.name,
        role: "REQUESTER",
      },
    });

    // 2. IT Staff posts a response comment
    const comment2Res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", staff.cookie)
      .send({ content: "We are investigating the issue now." });

    expect(comment2Res.status).toBe(201);
    expect(comment2Res.body).toMatchObject({
      id: expect.any(Number),
      content: "We are investigating the issue now.",
      author: {
        id: staff.user.id,
        name: staff.user.name,
        role: "IT_STAFF",
      },
    });

    // 3. Admin posts an audit comment
    const comment3Res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", admin.cookie)
      .send({ content: "Admin note: SLA escalated." });

    expect(comment3Res.status).toBe(201);

    // 4. Requester retrieves public comments thread (BR-28: chronological order)
    const listReqRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requesterA.cookie);

    expect(listReqRes.status).toBe(200);
    expect(Array.isArray(listReqRes.body)).toBe(true);
    expect(listReqRes.body).toHaveLength(3);
    expect(listReqRes.body[0].content).toBe("Could you please look into this today?");
    expect(listReqRes.body[1].content).toBe("We are investigating the issue now.");
    expect(listReqRes.body[2].content).toBe("Admin note: SLA escalated.");

    // 5. IT Staff retrieves public comments thread
    const listStaffRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", staff.cookie);

    expect(listStaffRes.status).toBe(200);
    expect(listStaffRes.body).toHaveLength(3);

    // 6. Admin retrieves public comments thread
    const listAdminRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", admin.cookie);

    expect(listAdminRes.status).toBe(200);
    expect(listAdminRes.body).toHaveLength(3);
  });

  it("preserves stable chronological order using id as tie-break when createdAt timestamps match", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Tie-break sorting test ticket",
        description: "Checking secondary sort on id",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    const fixedTime = new Date("2026-09-10T12:00:00.000Z");
    await prisma.comment.create({
      data: {
        ticketId,
        authorId: requester.user.id,
        content: "First created comment",
        createdAt: fixedTime,
      },
    });
    await prisma.comment.create({
      data: {
        ticketId,
        authorId: requester.user.id,
        content: "Second created comment",
        createdAt: fixedTime,
      },
    });

    const res = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requester.cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].content).toBe("First created comment");
    expect(res.body[1].content).toBe("Second created comment");
    expect(res.body[0].id).toBeLessThan(res.body[1].id);
  });

  it("returns 404 when non-owning Requester attempts to read or post public comments (ADR-0005)", async () => {
    const requesterA = await loginAs("jennifer.anderson@example.ac.th");
    const requesterB = await loginAs("marcus.chen@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterA.cookie)
      .send({
        summary: "Confidential Ticket A",
        description: "Requester B must not access",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    // Requester B reading comments on A's ticket -> 404
    const getRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requesterB.cookie);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe("TICKET_NOT_FOUND");

    // Requester B posting comment on A's ticket -> 404
    const postRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requesterB.cookie)
      .send({ content: "Sneaky comment attempt" });
    expect(postRes.status).toBe(404);
    expect(postRes.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects empty, whitespace-only, and >2000 character comments with 400 VALIDATION_FAILED (BR-27)", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Validation Test Ticket",
        description: "Testing comment bounds",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    // Empty content
    const emptyRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requester.cookie)
      .send({ content: "" });
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error.code).toBe("VALIDATION_FAILED");

    // Whitespace-only content
    const whitespaceRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requester.cookie)
      .send({ content: "   \n\t   " });
    expect(whitespaceRes.status).toBe(400);
    expect(whitespaceRes.body.error.code).toBe("VALIDATION_FAILED");

    // Exceeding 2,000 characters
    const over2000Res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Cookie", requester.cookie)
      .send({ content: "x".repeat(2001) });
    expect(over2000Res.status).toBe(400);
    expect(over2000Res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects anonymous requests with 401 UNAUTHENTICATED", async () => {
    const getRes = await request(app).get("/api/tickets/1/comments");
    expect(getRes.status).toBe(401);
    expect(getRes.body.error.code).toBe("UNAUTHENTICATED");

    const postRes = await request(app)
      .post("/api/tickets/1/comments")
      .send({ content: "Hello" });
    expect(postRes.status).toBe(401);
    expect(postRes.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("API-15 — Post and get Internal Notes on Ticket (AC-15, BR-04)", () => {
  it("allows IT Staff and Administrator to post and read internal notes in chronological order", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const admin = await loginAs("admin@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    // Requester creates ticket
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Internal Notes Test Ticket",
        description: "Staff operational workflow note check",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "HIGH",
      });
    const ticketId = createRes.body.id;

    // 1. Staff posts an internal note
    const note1Res = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staff.cookie)
      .send({ content: "  Battery SKU 4820-A requested from Dell inventory.  " });

    expect(note1Res.status).toBe(201);
    expect(note1Res.body).toMatchObject({
      id: expect.any(Number),
      content: "Battery SKU 4820-A requested from Dell inventory.",
      createdAt: expect.any(String),
      author: {
        id: staff.user.id,
        name: staff.user.name,
        role: "IT_STAFF",
      },
    });

    // 2. Admin posts an internal note
    const note2Res = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", admin.cookie)
      .send({ content: "Approved purchase order #PO-9912." });

    expect(note2Res.status).toBe(201);
    expect(note2Res.body).toMatchObject({
      id: expect.any(Number),
      content: "Approved purchase order #PO-9912.",
      author: {
        id: admin.user.id,
        name: admin.user.name,
        role: "ADMINISTRATOR",
      },
    });

    // 3. Staff retrieves internal notes list
    const listStaffRes = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staff.cookie);

    expect(listStaffRes.status).toBe(200);
    expect(Array.isArray(listStaffRes.body)).toBe(true);
    expect(listStaffRes.body).toHaveLength(2);
    expect(listStaffRes.body[0].content).toBe("Battery SKU 4820-A requested from Dell inventory.");
    expect(listStaffRes.body[1].content).toBe("Approved purchase order #PO-9912.");

    // 4. Admin retrieves internal notes list
    const listAdminRes = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", admin.cookie);

    expect(listAdminRes.status).toBe(200);
    expect(listAdminRes.body).toHaveLength(2);
  });

  it("preserves stable chronological order using id as tie-break when createdAt timestamps match", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Internal note tie break test",
        description: "Testing notes secondary sort",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    const fixedTime = new Date("2026-09-10T12:00:00.000Z");
    await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: staff.user.id,
        content: "First created note",
        createdAt: fixedTime,
      },
    });
    await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: staff.user.id,
        content: "Second created note",
        createdAt: fixedTime,
      },
    });

    const res = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].content).toBe("First created note");
    expect(res.body[1].content).toBe("Second created note");
    expect(res.body[0].id).toBeLessThan(res.body[1].id);
  });

  it("rejects empty, whitespace-only, and >2000 character notes with 400 VALIDATION_FAILED (BR-27)", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Note Validation Ticket",
        description: "Checking note bounds",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    // Empty content
    const emptyRes = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staff.cookie)
      .send({ content: "" });
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error.code).toBe("VALIDATION_FAILED");

    // Whitespace-only content
    const whitespaceRes = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staff.cookie)
      .send({ content: "   " });
    expect(whitespaceRes.status).toBe(400);
    expect(whitespaceRes.body.error.code).toBe("VALIDATION_FAILED");

    // Exceeding 2,000 characters
    const over2000Res = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", staff.cookie)
      .send({ content: "a".repeat(2001) });
    expect(over2000Res.status).toBe(400);
    expect(over2000Res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 when ticket does not exist", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");

    const getRes = await request(app)
      .get("/api/tickets/999999/notes")
      .set("Cookie", staff.cookie);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe("TICKET_NOT_FOUND");

    const postRes = await request(app)
      .post("/api/tickets/999999/notes")
      .set("Cookie", staff.cookie)
      .send({ content: "Note for missing ticket" });
    expect(postRes.status).toBe(404);
    expect(postRes.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects anonymous requests with 401 UNAUTHENTICATED", async () => {
    const getRes = await request(app).get("/api/tickets/1/notes");
    expect(getRes.status).toBe(401);
    expect(getRes.body.error.code).toBe("UNAUTHENTICATED");

    const postRes = await request(app)
      .post("/api/tickets/1/notes")
      .send({ content: "Secret note" });
    expect(postRes.status).toBe(401);
    expect(postRes.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("API-16 — Requester attempts to post Internal Note (AC-08, BR-04)", () => {
  it("rejects Requester with 403 FORBIDDEN and creates no note in the database", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Note forbidden test",
        description: "Requester must be rejected",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", requester.cookie)
      .send({ content: "Requester trying to post internal note" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });

    const noteInDb = await prisma.internalNote.findFirst({
      where: { ticketId },
    });
    expect(noteInDb).toBeNull();
  });
});
