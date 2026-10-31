import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import type { TicketStatus } from "../../src/generated/prisma/client";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

// Keep one HTTP listener for the exhaustive matrix rather than reopening a port per request.
const server = app.listen(0);
beforeAll(async () => {
  if (!server.listening) await new Promise<void>(resolve => server.once("listening", resolve));
});
beforeEach(truncateTransactionalData);
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

async function login(email: string) {
  const result = await request(server).post("/api/auth/login").send({ email, password: "Password123!" });
  expect(result.status).toBe(200);
  return { cookie: result.headers["set-cookie"], user: result.body.user };
}

async function createTicket(cookie: string[]) {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const created = await request(server).post("/api/tickets").set("Cookie", cookie).send({
    summary: "Final Ticket lifecycle", description: "Work through resolution and closure.",
    requestedPriority: "MEDIUM", categoryId: category.id, relatedSystemId: relatedSystem.id,
  });
  expect(created.status).toBe(201);
  return created.body;
}

const operators = ["michael.brown@toktickit.com", "admin@toktickit.com"];

// Expected values are the final BR-15 matrix, independent of the implementation.
const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

describe.each(operators)("API-10, API-11 — final matrix for %s (AC-09, AC-10, BR-15, BR-16)", email => {
  it.each(Object.keys(matrix) as TicketStatus[])("enforces every outgoing edge from %s without changing rejected writes", async from => {
    const requester = await login("jennifer.anderson@example.ac.th");
    const operator = await login(email);
    const ticket = await createTicket(requester.cookie);
    for (const to of Object.keys(matrix) as TicketStatus[]) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: from, version: 0 } });
      const before = await request(server).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", operator.cookie);
      expect(before.status).toBe(200);
      expect(before.body.permittedTransitions).toEqual(matrix[from]);
      const result = await request(server).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", operator.cookie)
        .send({ status: to, expectedVersion: 0 });
      const after = await request(server).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", operator.cookie);
      if (matrix[from].includes(to)) {
        expect(result.status, `${from} → ${to}`).toBe(200);
        expect(result.body).toMatchObject({ status: to, ticketVersion: 1, permittedTransitions: matrix[to] });
        expect(after.body).toMatchObject({ status: to, version: 1, permittedTransitions: matrix[to] });
      } else {
        expect(result.status, `${from} → ${to}`).toBe(400);
        expect(result.body.error.code).toBe("INVALID_STATUS_TRANSITION");
        expect(after.body).toEqual(before.body);
      }
    }
  });
});

describe("API-13, API-14 — operational-role access (AC-23, BR-20, ADR-0010)", () => {
  it("lists active operational owners so Staff can assign an already-owned Ticket to an Administrator", async () => {
    const requester = await login("jennifer.anderson@example.ac.th");
    const staff = await login("michael.brown@toktickit.com");
    const admin = await login("admin@toktickit.com");
    const ticket = await createTicket(requester.cookie);
    const claimed = await request(server).patch(`/api/staff/tickets/${ticket.id}/owner`).set("Cookie", staff.cookie)
      .send({ ownerId: staff.user.id, expectedVersion: 0 });
    expect(claimed.status).toBe(200);
    for (const operator of [staff, admin]) {
      const assignees = await request(server).get("/api/staff/assignees").set("Cookie", operator.cookie);
      expect(assignees.status).toBe(200);
      expect(assignees.body).toEqual(expect.arrayContaining([
        { id: staff.user.id, name: staff.user.name, role: "IT_STAFF" },
        { id: admin.user.id, name: admin.user.name, role: "ADMINISTRATOR" },
      ]));
      expect(assignees.body.every((user: { role: string }) => ["IT_STAFF", "ADMINISTRATOR"].includes(user.role))).toBe(true);
      expect(assignees.body.map((user: { name: string }) => user.name)).toEqual(
        assignees.body.map((user: { name: string }) => user.name).toSorted((a: string, b: string) => a.localeCompare(b)),
      );
      const inactive = await prisma.user.findFirstOrThrow({ where: { isActive: false, role: "IT_STAFF" } });
      expect(assignees.body).not.toContainEqual(expect.objectContaining({ id: inactive.id }));
    }
    const assigned = await request(server).patch(`/api/staff/tickets/${ticket.id}/owner`).set("Cookie", staff.cookie)
      .send({ ownerId: admin.user.id, expectedVersion: 1 });
    expect(assigned.status).toBe(200);
    const detail = await request(server).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", admin.cookie);
    expect(detail.body).toMatchObject({ ticketOwner: { id: admin.user.id, name: admin.user.name }, status: "OPEN", version: 2 });
  });

  it("allows an Administrator to find, claim, prioritise and work a Ticket while IT Staff cannot manage Users", async () => {
    const requester = await login("jennifer.anderson@example.ac.th");
    const admin = await login("admin@toktickit.com");
    const staff = await login("michael.brown@toktickit.com");
    const ticket = await createTicket(requester.cookie);
    const queue = await request(server).get("/api/staff/tickets").set("Cookie", admin.cookie);
    expect(queue.status).toBe(200);
    expect(queue.body.items).toEqual([expect.objectContaining({ id: ticket.id })]);
    const assignees = await request(server).get("/api/staff/assignees").set("Cookie", admin.cookie);
    expect(assignees.status).toBe(200);
    expect(assignees.body.length).toBeGreaterThan(0);
    expect(assignees.body.every((user: { role: string }) => ["IT_STAFF", "ADMINISTRATOR"].includes(user.role))).toBe(true);
    const claim = await request(server).patch(`/api/staff/tickets/${ticket.id}/owner`).set("Cookie", admin.cookie)
      .send({ ownerId: admin.user.id, expectedVersion: 0 });
    expect(claim.status).toBe(200);
    expect(claim.body).toMatchObject({ status: "OPEN", ticketOwnerId: admin.user.id, ticketVersion: 1,
      permittedTransitions: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"] });
    const priority = await request(server).patch(`/api/staff/tickets/${ticket.id}/priority`).set("Cookie", admin.cookie)
      .send({ itPriority: "HIGH", expectedVersion: 1 });
    expect(priority.status).toBe(200);
    expect(priority.body).toMatchObject({ itPriority: "HIGH", ticketVersion: 2 });
    const action = await request(server).post(`/api/tickets/${ticket.id}/actions`).set("Cookie", admin.cookie)
      .send({ description: "Replaced battery", result: "Charge restored", expectedVersion: 2 });
    expect(action.status).toBe(201);
    expect(action.body).toMatchObject({ ticketVersion: 3, action: { performedBy: { id: admin.user.id } } });
    const forbidden = await request(server).get("/api/admin/users").set("Cookie", staff.cookie);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");
  });
});

describe("API-11, API-13 — server-owned transitions (AC-10, AC-23, FR-07, BR-20)", () => {
  it.each(operators)("exposes permittedTransitions to %s", async email => {
    const requester = await login("jennifer.anderson@example.ac.th");
    const operator = await login(email);
    const ticket = await createTicket(requester.cookie);
    const detail = await request(server).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", operator.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ version: 0, permittedTransitions: ["OPEN", "IN_PROGRESS", "CANCELLED"] });
    const ownDetail = await request(server).get(`/api/tickets/${ticket.id}`).set("Cookie", requester.cookie);
    expect(ownDetail.body).not.toHaveProperty("permittedTransitions");
  });
});

describe("API-12, API-15 — resolution gate (AC-08, AC-11, BR-17, BR-18)", () => {
  it("keeps the Requester's indication advisory and rejects direct Requester status writes", async () => {
    const requester = await login("jennifer.anderson@example.ac.th");
    const staff = await login(operators[0]);
    const admin = await login(operators[1]);
    const ticket = await createTicket(requester.cookie);
    const opened = await request(server).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", staff.cookie)
      .send({ status: "OPEN", expectedVersion: 0 });
    expect(opened.status).toBe(200);
    for (const status of ["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]) {
      const denied = await request(server).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", requester.cookie)
        .send({ status, expectedVersion: 1 });
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe("FORBIDDEN");
    }
    const indication = await request(server).post(`/api/tickets/${ticket.id}/resolve-indication`).set("Cookie", requester.cookie)
      .send({ expectedVersion: 1 });
    expect(indication.status).toBe(200);
    expect(indication.body).toMatchObject({ resolvedByRequester: true, ticketVersion: 2 });
    const before = await request(server).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", staff.cookie);
    expect(before.body).toMatchObject({ status: "OPEN", resolvedByRequester: true, version: 2 });
    for (const operator of [staff, admin]) {
      const stale = await request(server).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", operator.cookie)
        .send({ status: "RESOLVED", expectedVersion: 1 });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe("STALE_UPDATE");
      const denied = await request(server).post(`/api/tickets/${ticket.id}/resolve-indication`).set("Cookie", operator.cookie)
        .send({ expectedVersion: 2 });
      expect(denied.status).toBe(403);
    }
    const after = await request(server).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", staff.cookie);
    expect(after.body).toEqual(before.body);
  });

  it("allows exactly one status writer when Staff and Administrator submit the same version", async () => {
    const requester = await login("jennifer.anderson@example.ac.th");
    const staff = await login(operators[0]);
    const admin = await login(operators[1]);
    const ticket = await createTicket(requester.cookie);
    const results = await Promise.all([staff, admin].map((operator, index) =>
      request(server).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", operator.cookie)
        .send({ status: index === 0 ? "OPEN" : "CANCELLED", expectedVersion: 0 }),
    ));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    const winner = results.find(result => result.status === 200)!;
    const detail = await request(server).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", staff.cookie);
    expect(detail.body).toMatchObject({ status: winner.body.status, version: 1 });
  });
});
