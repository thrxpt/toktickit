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

async function getFixtures() {
  const category = await prisma.category.findFirstOrThrow({
    where: { isActive: true },
  });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
    where: { isActive: true },
  });
  const requester = await prisma.user.findFirstOrThrow({
    where: { email: "jennifer.anderson@example.ac.th" },
  });
  const staff1 = await prisma.user.findFirstOrThrow({
    where: { email: "michael.brown@toktickit.com" },
  });
  const staff2 = await prisma.user.findFirstOrThrow({
    where: { email: "sarah.johnson@toktickit.com" },
  });
  const inactiveStaff = await prisma.user.findFirstOrThrow({
    where: { email: "former.agent@toktickit.com" },
  });
  const admin = await prisma.user.findFirstOrThrow({
    where: { email: "admin@toktickit.com" },
  });

  return {
    category,
    relatedSystem,
    requester,
    staff1,
    staff2,
    inactiveStaff,
    admin,
  };
}

async function createTicket(overrides: {
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
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
  itPriority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary?: string;
  description?: string;
} = {}) {
  const fixtures = await getFixtures();
  return prisma.ticket.create({
    data: {
      ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      summary: overrides.summary ?? "Operational detail test ticket",
      description: overrides.description ?? "Testing staff ticket details workstation.",
      categoryId: fixtures.category.id,
      relatedSystemId: fixtures.relatedSystem.id,
      requesterId: fixtures.requester.id,
      ticketOwnerId: overrides.ticketOwnerId ?? null,
      requestedPriority: overrides.requestedPriority ?? "MEDIUM",
      itPriority: overrides.itPriority ?? "MEDIUM",
      status: overrides.status ?? "NEW",
    },
  });
}

describe("GET /api/staff/tickets/:id (FR-10, BR-14, BR-15)", () => {
  it("returns comprehensive ticket detail for authenticated IT Staff", async () => {
    const fixtures = await getFixtures();
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({
      ticketOwnerId: fixtures.staff2.id,
      status: "IN_PROGRESS",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
    });

    const res = await request(app)
      .get(`/api/staff/tickets/${ticket.id}`)
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      category: {
        id: fixtures.category.id,
        name: fixtures.category.name,
      },
      relatedSystem: {
        id: fixtures.relatedSystem.id,
        name: fixtures.relatedSystem.name,
      },
      requester: {
        id: fixtures.requester.id,
        name: fixtures.requester.name,
        email: fixtures.requester.email,
      },
      ticketOwner: {
        id: fixtures.staff2.id,
        name: fixtures.staff2.name,
      },
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      status: "IN_PROGRESS",
      resolvedByRequester: false,
      attachments: [],
      publicCommentsCount: 0,
      internalNotesCount: 0,
    });
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it("returns null for ticketOwner when ticket is unassigned", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ ticketOwnerId: null });

    const res = await request(app)
      .get(`/api/staff/tickets/${ticket.id}`)
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(200);
    expect(res.body.ticketOwner).toBeNull();
  });

  it("rejects Administrator with 403 Forbidden (BR-14, ADR-0008)", async () => {
    const admin = await loginAs("admin@toktickit.com");
    const ticket = await createTicket();

    const res = await request(app)
      .get(`/api/staff/tickets/${ticket.id}`)
      .set("Cookie", admin.cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for nonexistent ticket ID", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .get("/api/staff/tickets/999999")
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("returns 400 for invalid non-numeric ticket ID (AC-21)", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .get("/api/staff/tickets/invalid-id")
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("id");
  });

  it("returns 400 for oversized ticket ID exceeding integer range (AC-21, BR-35)", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .get("/api/staff/tickets/999999999999999999999999999")
      .set("Cookie", staff.cookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("id");
  });

  it("rejects Requester with 403 Forbidden (BR-15)", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const ticket = await createTicket();

    const res = await request(app)
      .get(`/api/staff/tickets/${ticket.id}`)
      .set("Cookie", requester.cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("API-11 — IT Staff claims and reassigns ticket ownership (AC-11, BR-18, BR-23)", () => {
  it("claims unassigned ticket in NEW status and auto-advances status to OPEN", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({
      status: "NEW",
      ticketOwnerId: null,
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", staff.cookie)
      .send({ ownerId: staff.user.id });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ticketId: ticket.id,
      ticketOwnerId: staff.user.id,
      status: "OPEN",
      message: "Ticket ownership updated.",
    });

    // Verify in database
    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(updated.ticketOwnerId).toBe(staff.user.id);
    expect(updated.status).toBe("OPEN");
  });

  it("claims ticket in IN_PROGRESS status without altering status", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({
      status: "IN_PROGRESS",
      ticketOwnerId: null,
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", staff.cookie)
      .send({ ownerId: staff.user.id });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ticketId: ticket.id,
      ticketOwnerId: staff.user.id,
      status: "IN_PROGRESS",
      message: "Ticket ownership updated.",
    });

    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(updated.ticketOwnerId).toBe(staff.user.id);
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("reassigns ownership to another active staff member", async () => {
    const fixtures = await getFixtures();
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({
      status: "OPEN",
      ticketOwnerId: fixtures.staff1.id,
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", staff.cookie)
      .send({ ownerId: fixtures.staff2.id });

    expect(res.status).toBe(200);
    expect(res.body.ticketOwnerId).toBe(fixtures.staff2.id);

    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(updated.ticketOwnerId).toBe(fixtures.staff2.id);
  });

  it("unassigns ticket when ownerId is null", async () => {
    const fixtures = await getFixtures();
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({
      status: "OPEN",
      ticketOwnerId: fixtures.staff1.id,
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", staff.cookie)
      .send({ ownerId: null });

    expect(res.status).toBe(200);
    expect(res.body.ticketOwnerId).toBeNull();

    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(updated.ticketOwnerId).toBeNull();
  });

  it("does not auto-advance status from NEW when unassigning ownerId to null (BR-23)", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({
      status: "NEW",
      ticketOwnerId: null,
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", staff.cookie)
      .send({ ownerId: null });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("NEW");
    expect(res.body.ticketOwnerId).toBeNull();

    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(updated.status).toBe("NEW");
    expect(updated.ticketOwnerId).toBeNull();
  });

  it("returns 400 for invalid non-numeric ticket ID (AC-21)", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .patch("/api/staff/tickets/invalid-id/owner")
      .set("Cookie", staff.cookie)
      .send({ ownerId: staff.user.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("id");
  });

  it("rejects assigning ownership to inactive staff member (BR-18)", async () => {
    const fixtures = await getFixtures();
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ status: "OPEN" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", staff.cookie)
      .send({ ownerId: fixtures.inactiveStaff.id });

    expect(res.status).toBe(400);
  });

  it("rejects assigning ownership to a user with role REQUESTER (BR-18)", async () => {
    const fixtures = await getFixtures();
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ status: "OPEN" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", staff.cookie)
      .send({ ownerId: fixtures.requester.id });

    expect(res.status).toBe(400);
  });

  it("returns 404 when setting owner on nonexistent ticket", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .patch("/api/staff/tickets/999999/owner")
      .set("Cookie", staff.cookie)
      .send({ ownerId: staff.user.id });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects Requester caller with 403 Forbidden", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const ticket = await createTicket();

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", requester.cookie)
      .send({ ownerId: null });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects Administrator caller with 403 Forbidden (BR-14, ADR-0008)", async () => {
    const admin = await loginAs("admin@toktickit.com");
    const ticket = await createTicket();

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/owner`)
      .set("Cookie", admin.cookie)
      .send({ ownerId: admin.user.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("API-12 — IT Staff updates IT Priority (AC-12, BR-19, BR-20)", () => {
  it("updates IT Priority to CRITICAL while leaving requestedPriority unchanged", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({
      requestedPriority: "LOW",
      itPriority: "LOW",
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/priority`)
      .set("Cookie", staff.cookie)
      .send({ itPriority: "CRITICAL" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ticketId: ticket.id,
      itPriority: "CRITICAL",
      message: "IT Priority updated.",
    });

    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(updated.itPriority).toBe("CRITICAL");
    expect(updated.requestedPriority).toBe("LOW");
  });

  it("updates IT Priority to HIGH, MEDIUM, LOW", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ itPriority: "LOW" });

    for (const priority of ["MEDIUM", "HIGH", "LOW"] as const) {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", staff.cookie)
        .send({ itPriority: priority });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe(priority);
    }
  });

  it("rejects invalid IT priority value with 400 Bad Request", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket();

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/priority`)
      .set("Cookie", staff.cookie)
      .send({ itPriority: "SUPER_URGENT" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid non-numeric ticket ID (AC-21)", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .patch("/api/staff/tickets/invalid-id/priority")
      .set("Cookie", staff.cookie)
      .send({ itPriority: "HIGH" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("id");
  });

  it("returns 404 for nonexistent ticket ID", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .patch("/api/staff/tickets/999999/priority")
      .set("Cookie", staff.cookie)
      .send({ itPriority: "HIGH" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects Requester caller with 403 Forbidden", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const ticket = await createTicket();

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/priority`)
      .set("Cookie", requester.cookie)
      .send({ itPriority: "HIGH" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects Administrator caller with 403 Forbidden (BR-14, ADR-0008)", async () => {
    const admin = await loginAs("admin@toktickit.com");
    const ticket = await createTicket();

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/priority`)
      .set("Cookie", admin.cookie)
      .send({ itPriority: "HIGH" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("API-13 — IT Staff executes validated status transition (AC-13, BR-22)", () => {
  it("executes permitted transition from OPEN to IN_PROGRESS", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ status: "OPEN" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", staff.cookie)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ticketId: ticket.id,
      status: "IN_PROGRESS",
      message: "Status updated successfully.",
    });

    const updated = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("executes permitted transition from IN_PROGRESS to RESOLVED", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ status: "IN_PROGRESS" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", staff.cookie)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("RESOLVED");
  });

  it("rejects invalid status transition (NEW -> RESOLVED) with 400 and INVALID_STATUS_TRANSITION code", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ status: "NEW" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", staff.cookie)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "INVALID_STATUS_TRANSITION",
        message: expect.stringContaining("NEW directly to RESOLVED"),
      },
    });

    // Ensure status was not changed in database
    const unchanged = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(unchanged.status).toBe("NEW");
  });

  it("rejects transitions out of terminal CANCELLED state", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const ticket = await createTicket({ status: "CANCELLED" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", staff.cookie)
      .send({ status: "REOPENED" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("returns 400 for invalid non-numeric ticket ID (AC-21)", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .patch("/api/staff/tickets/invalid-id/status")
      .set("Cookie", staff.cookie)
      .send({ status: "OPEN" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("id");
  });

  it("returns 404 for nonexistent ticket ID", async () => {
    const staff = await loginAs("michael.brown@toktickit.com");
    const res = await request(app)
      .patch("/api/staff/tickets/999999/status")
      .set("Cookie", staff.cookie)
      .send({ status: "OPEN" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects Requester caller with 403 Forbidden", async () => {
    const requester = await loginAs("jennifer.anderson@example.ac.th");
    const ticket = await createTicket({ status: "OPEN" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", requester.cookie)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects Administrator caller with 403 Forbidden (BR-14, ADR-0008)", async () => {
    const admin = await loginAs("admin@toktickit.com");
    const ticket = await createTicket({ status: "OPEN" });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
