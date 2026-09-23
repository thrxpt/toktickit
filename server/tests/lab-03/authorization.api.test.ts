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

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

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

describe("API-06 — Requester ticket creation derives owner from session (AC-06, BR-03)", () => {
  it("creates ticket deriving requesterId from authenticated session cookie", async () => {
    const { user, cookie } = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const payload = {
      summary: "Keyboard key sticking",
      description: "The spacebar on my laptop sticks intermittently.",
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      requestedPriority: "LOW",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
      summary: payload.summary,
      description: payload.description,
      requestedPriority: "LOW",
      status: "NEW",
      category: { id: category.id, name: category.name },
      relatedSystem: { id: relatedSystem.id, name: relatedSystem.name },
      requester: { id: user.id, name: user.name },
    });

    const ticketInDb = await prisma.ticket.findUnique({
      where: { id: res.body.id },
    });
    expect(ticketInDb).not.toBeNull();
    expect(ticketInDb?.requesterId).toBe(user.id);
  });

  it("creates ticket deriving requesterId from Bearer token fallback", async () => {
    const { user, token } = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const payload = {
      summary: "Monitor flickering",
      description: "External monitor flickers after waking from sleep.",
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      requestedPriority: "MEDIUM",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.requester.id).toBe(user.id);
  });

  it("rejects ticket creation with 400 REQUESTER_ID_IN_BODY when requesterId is in body", async () => {
    const { cookie } = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const payload = {
      summary: "Spoofed ticket",
      description: "Attempting to spoof requesterId.",
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      requestedPriority: "HIGH",
      requesterId: 9999,
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "REQUESTER_ID_IN_BODY",
        message: expect.any(String),
      },
    });
  });

  it("lists only tickets owned by the authenticated Requester", async () => {
    const requesterA = await loginAs("jennifer.anderson@example.ac.th");
    const requesterB = await loginAs("marcus.chen@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    // Requester A creates a ticket
    await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterA.cookie)
      .send({
        summary: "Ticket for Requester A",
        description: "Visible only to Requester A",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });

    // Requester B creates a ticket
    await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterB.cookie)
      .send({
        summary: "Ticket for Requester B",
        description: "Visible only to Requester B",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });

    // Requester A lists tickets
    const listA = await request(app)
      .get("/api/tickets")
      .set("Cookie", requesterA.cookie);

    expect(listA.status).toBe(200);
    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0].summary).toBe("Ticket for Requester A");

    // Requester B lists tickets
    const listB = await request(app)
      .get("/api/tickets")
      .set("Cookie", requesterB.cookie);

    expect(listB.status).toBe(200);
    expect(listB.body.data).toHaveLength(1);
    expect(listB.body.data[0].summary).toBe("Ticket for Requester B");
  });
});

describe("API-07 — Requester fetching another user's Ticket (AC-07, BR-16)", () => {
  it("returns 404 TICKET_NOT_FOUND when requester fetches another user's ticket", async () => {
    const requesterA = await loginAs("jennifer.anderson@example.ac.th");
    const requesterB = await loginAs("marcus.chen@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    // Requester A creates a ticket
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterA.cookie)
      .send({
        summary: "Requester A Confidential Ticket",
        description: "Should not be accessible by Requester B",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "HIGH",
      });
    const ticketId = createRes.body.id;

    // Requester A can fetch their own ticket
    const resA = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("Cookie", requesterA.cookie);
    expect(resA.status).toBe(200);
    expect(resA.body.id).toBe(ticketId);

    // Requester B fetches Requester A's ticket -> 404
    const resB = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("Cookie", requesterB.cookie);
    expect(resB.status).toBe(404);
    expect(resB.body).toEqual({
      error: {
        code: "TICKET_NOT_FOUND",
        message: expect.any(String),
      },
    });

    // Compare with non-existent ticket -> returns identical 404 error (no enumeration)
    const resNonExistent = await request(app)
      .get("/api/tickets/999999")
      .set("Cookie", requesterB.cookie);
    expect(resNonExistent.status).toBe(404);
    expect(resNonExistent.body).toEqual({
      error: {
        code: "TICKET_NOT_FOUND",
        message: expect.any(String),
      },
    });
  });

  it("returns 404 ATTACHMENT_NOT_FOUND when requester fetches another user's attachment content", async () => {
    const requesterA = await loginAs("jennifer.anderson@example.ac.th");
    const requesterB = await loginAs("marcus.chen@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    // Create ticket for requester A
    const createTicketRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterA.cookie)
      .send({
        summary: "Attachment ticket",
        description: "Testing cross-requester attachment isolation",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createTicketRes.body.id;

    // Upload attachment as requester A
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", requesterA.cookie)
      .attach("file", PNG_HEADER, "screenshot.png");
    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.id;

    // Requester B attempts to download attachment -> 404
    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/content`)
      .set("Cookie", requesterB.cookie);
    expect(downloadRes.status).toBe(404);
    expect(downloadRes.body).toEqual({
      error: {
        code: "ATTACHMENT_NOT_FOUND",
        message: expect.any(String),
      },
    });

    // Requester B attempts to remove attachment -> 404
    const removeRes = await request(app)
      .post(`/api/attachments/${attachmentId}/removal`)
      .set("Cookie", requesterB.cookie)
      .send({ reason: "Unauthorized attempt" });
    expect(removeRes.status).toBe(404);
    expect(removeRes.body).toEqual({
      error: {
        code: "ATTACHMENT_NOT_FOUND",
        message: expect.any(String),
      },
    });

    // Also verify /remove alias returns 404 for Requester B
    const removeAliasRes = await request(app)
      .post(`/api/attachments/${attachmentId}/remove`)
      .set("Cookie", requesterB.cookie)
      .send({ reason: "Unauthorized attempt" });
    expect(removeAliasRes.status).toBe(404);
  });
});

describe("API-08 — Requester requesting Internal Notes endpoint (AC-08, BR-17)", () => {
  it("returns 403 Forbidden without note data when requester attempts to read internal notes", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    // Create a ticket as requester
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Internal note confidentiality ticket",
        description: "Testing that requester cannot read internal notes",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "MEDIUM",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // Staff creates an internal note in the database
    await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: staff.user.id,
        content: "Top-secret internal diagnostic note for staff only",
      },
    });

    // Requester calls GET /api/tickets/:id/notes
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set("Cookie", requester.cookie);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });
    // Ensure no note content was returned in body
    expect(JSON.stringify(res.body)).not.toContain("Top-secret internal diagnostic note");
  });
});

describe("API-09 — Requester indicates Problem Appears Resolved (AC-09, BR-24)", () => {
  it("allows owning Requester to indicate problem resolved without changing ticket status", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Ticket to be resolved by requester",
        description: "Checking that resolution indicator works without changing status",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // Advance ticket status to IN_PROGRESS directly in DB (simulating staff work)
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "IN_PROGRESS" },
    });

    // Requester posts to resolve-indication endpoint
    const resolveRes = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Cookie", requester.cookie);

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body).toEqual({
      id: ticketId,
      resolvedByRequester: true,
      message: "Problem indicated as resolved. IT Staff will review and formally close the ticket.",
    });

    // Verify in database: resolvedByRequester is true, status remains IN_PROGRESS (BR-05, BR-24)
    const ticketInDb = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    expect(ticketInDb?.resolvedByRequester).toBe(true);
    expect(ticketInDb?.status).toBe("IN_PROGRESS");
  });

  it("returns 404 when non-owning Requester attempts to indicate resolution", async () => {
    const requesterA = await loginAs("jennifer.anderson@example.ac.th");
    const requesterB = await loginAs("marcus.chen@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterA.cookie)
      .send({
        summary: "Requester A's ticket",
        description: "Requester B should not be able to resolve this",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    const resB = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Cookie", requesterB.cookie);

    expect(resB.status).toBe(404);
    expect(resB.body).toEqual({
      error: {
        code: "TICKET_NOT_FOUND",
        message: expect.any(String),
      },
    });
  });

  it("rejects resolution indication when ticket is CLOSED or CANCELLED (BR-24)", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Closed ticket",
        description: "Cannot flag resolution on closed ticket",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    // Set ticket to CLOSED in DB
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "CLOSED" },
    });

    const closedRes = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Cookie", requester.cookie);

    expect(closedRes.status).toBe(400);
    expect(closedRes.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-Requester (IT Staff, Admin) with 403 FORBIDDEN", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const admin = await loginAs("admin@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Staff cannot indicate requester resolution",
        description: "Role segregation check",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    const staffRes = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Cookie", staff.cookie);
    expect(staffRes.status).toBe(403);
    expect(staffRes.body.error.code).toBe("FORBIDDEN");

    const adminRes = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Cookie", admin.cookie);
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error.code).toBe("FORBIDDEN");
  });
});

describe("Role segregation & attachment download permissions (BR-14, BR-15, FR-20, ADR-0008)", () => {
  it("rejects IT Staff and Administrator accessing requester endpoints with 403 FORBIDDEN", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const admin = await loginAs("admin@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    const createRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Staff leak test ticket",
        description: "Checking that staff and admin cannot access requester ticket list",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    const ticketId = createRes.body.id;

    // Staff calling GET /api/tickets -> 403
    const staffListRes = await request(app)
      .get("/api/tickets")
      .set("Cookie", staff.cookie);
    expect(staffListRes.status).toBe(403);
    expect(staffListRes.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });

    // Admin calling GET /api/tickets -> 403
    const adminListRes = await request(app)
      .get("/api/tickets")
      .set("Cookie", admin.cookie);
    expect(adminListRes.status).toBe(403);
    expect(adminListRes.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });

    // Staff calling GET /api/tickets/:id -> 403
    const staffDetailRes = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("Cookie", staff.cookie);
    expect(staffDetailRes.status).toBe(403);
    expect(staffDetailRes.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });

    // Staff calling POST /api/tickets -> 403
    const staffCreateRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", staff.cookie)
      .send({
        summary: "Staff cannot create requester ticket",
        description: "Staff creation forbidden",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "LOW",
      });
    expect(staffCreateRes.status).toBe(403);
    expect(staffCreateRes.body.error.code).toBe("FORBIDDEN");
  });

  it("permits IT Staff to download active attachments via GET /api/attachments/:id/content", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const staff = await loginAs("michael.brown@toktickit.com");
    const { category, relatedSystem } = await getActiveFixtures();

    const createTicketRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", requester.cookie)
      .send({
        summary: "Attachment for staff inspection",
        description: "IT Staff should be able to download this active attachment",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: "MEDIUM",
      });
    const ticketId = createTicketRes.body.id;

    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", requester.cookie)
      .attach("file", PNG_HEADER, "staff-test.png");
    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.id;

    // IT Staff downloads attachment -> 200 OK
    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/content`)
      .set("Cookie", staff.cookie);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.header["content-type"]).toBe("image/png");
    expect(downloadRes.body).toBeDefined();

    // Administrator attempts to download attachment -> 403 FORBIDDEN (BR-14, ADR-0008)
    const admin = await loginAs("admin@toktickit.com");
    const adminDownloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/content`)
      .set("Cookie", admin.cookie);
    expect(adminDownloadRes.status).toBe(403);
    expect(adminDownloadRes.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });
  });

  it("returns 401 UNAUTHENTICATED on anonymous requests to protected routes without session or header", async () => {
    // GET /api/tickets without auth -> 401
    const anonTicketsRes = await request(app).get("/api/tickets");
    expect(anonTicketsRes.status).toBe(401);
    expect(anonTicketsRes.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: expect.any(String),
      },
    });

    // GET /api/staff/tickets without auth -> 401
    const anonStaffQueueRes = await request(app).get("/api/staff/tickets");
    expect(anonStaffQueueRes.status).toBe(401);
    expect(anonStaffQueueRes.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: expect.any(String),
      },
    });

    // GET /api/attachments/1/content without auth -> 401
    const anonAttRes = await request(app).get("/api/attachments/1/content");
    expect(anonAttRes.status).toBe(401);
    expect(anonAttRes.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: expect.any(String),
      },
    });

    // GET /api/staff/assignees without auth -> 401
    const anonAssigneesRes = await request(app).get("/api/staff/assignees");
    expect(anonAssigneesRes.status).toBe(401);
    expect(anonAssigneesRes.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: expect.any(String),
      },
    });
  });

  it("API-30 — rejects Requester and Administrator requesting /api/staff/tickets and /api/staff/assignees with 403 FORBIDDEN (BR-14, BR-15, ADR-0008)", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const admin = await loginAs("admin@toktickit.com");

    const requesterRes = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", requester.cookie);

    expect(requesterRes.status).toBe(403);
    expect(requesterRes.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });

    const adminRes = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", admin.cookie);

    expect(adminRes.status).toBe(403);
    expect(adminRes.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: expect.any(String),
      },
    });

    // Verify /api/staff/assignees also rejects Requester and Administrator with 403
    const requesterAssigneesRes = await request(app)
      .get("/api/staff/assignees")
      .set("Cookie", requester.cookie);
    expect(requesterAssigneesRes.status).toBe(403);
    expect(requesterAssigneesRes.body.error.code).toBe("FORBIDDEN");

    const adminAssigneesRes = await request(app)
      .get("/api/staff/assignees")
      .set("Cookie", admin.cookie);
    expect(adminAssigneesRes.status).toBe(403);
    expect(adminAssigneesRes.body.error.code).toBe("FORBIDDEN");
  });

  it("allows status query filtering with valid statuses beyond NEW (W6)", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const res = await request(app)
      .get("/api/tickets?status=OPEN")
      .set("Cookie", requester.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
