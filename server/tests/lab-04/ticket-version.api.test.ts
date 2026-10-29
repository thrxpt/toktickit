import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(truncateTransactionalData);
afterAll(() => prisma.$disconnect());

async function login(email: string) {
  const response = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  expect(response.status).toBe(200);
  return response.headers["set-cookie"];
}

async function setupTicket() {
  const requester = await login("jennifer.anderson@example.ac.th");
  const staff = await login("michael.brown@toktickit.com");
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const created = await request(app).post("/api/tickets").set("Cookie", requester).send({
    summary: "Version guarded Ticket", description: "Two writers must not overwrite each other.",
    requestedPriority: "MEDIUM", categoryId: category.id, relatedSystemId: relatedSystem.id,
  });
  expect(created.status).toBe(201);
  return { requester, staff, ticket: created.body };
}

describe("API-08, API-09 — Ticket version (AC-08, BR-11, BR-12)", () => {
  it("allows exactly one concurrent writer and rejects a stale retry without changing the winner", async () => {
    const { staff, ticket } = await setupTicket();
    expect(ticket.version).toBe(0);
    const responses = await Promise.all(["HIGH", "CRITICAL"].map(itPriority =>
      request(app).patch(`/api/staff/tickets/${ticket.id}/priority`).set("Cookie", staff)
        .send({ itPriority, expectedVersion: 0 }),
    ));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = responses.find(r => r.status === 200)!;
    expect(winner.body.ticketVersion).toBe(1);
    const stale = responses.find(r => r.status === 409)!;
    expect(stale.body.error).toMatchObject({ code: "STALE_UPDATE", message: "This ticket changed since you loaded it. Reload and try again." });
    const detail = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", staff);
    expect(detail.body).toMatchObject({ version: 1, itPriority: winner.body.itPriority });
  });
});

const mutations = [
  { path: "owner", payload: { ownerId: null } },
  { path: "priority", payload: { itPriority: "HIGH" } },
  { path: "status", payload: { status: "OPEN" } },
  { path: "resolve-indication", payload: {} },
];

function mutate(id: number, path: string, cookie: string[], body: object) {
  return path === "resolve-indication"
    ? request(app).post(`/api/tickets/${id}/${path}`).set("Cookie", cookie).send(body)
    : request(app).patch(`/api/staff/tickets/${id}/${path}`).set("Cookie", cookie).send(body);
}

describe("API-08, API-09, API-12 — guarded mutations (AC-08, AC-11, BR-11, BR-12)", () => {
  it.each(mutations)("$path increments once, rejects stale writes, and validates expectedVersion", async ({ path, payload }) => {
    const { staff, requester, ticket } = await setupTicket();
    const cookie = path === "resolve-indication" ? requester : staff;
    const result = await mutate(ticket.id, path, cookie, { ...payload, expectedVersion: 0 });
    expect(result.status).toBe(200);
    expect(result.body.ticketVersion).toBe(1);
    const before = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", staff);
    const stale = await mutate(ticket.id, path, cookie, { ...payload, expectedVersion: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("STALE_UPDATE");
    for (const expectedVersion of [undefined, -1, 0.5, "1", null]) {
      const invalid = await mutate(ticket.id, path, cookie, { ...payload, expectedVersion });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error).toMatchObject({ code: "VALIDATION_FAILED", fields: { expectedVersion: expect.any(String) } });
    }
    const after = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", staff);
    expect(after.body).toEqual(before.body);
    if (path === "resolve-indication") {
      expect(after.body).toMatchObject({ resolvedByRequester: true, status: "NEW" });
      const staleStaff = await mutate(ticket.id, "priority", staff, { itPriority: "CRITICAL", expectedVersion: 0 });
      expect(staleStaff.status).toBe(409);
    }
  });
});

describe("API-08, API-09, API-12 — aggregate boundary (AC-08, AC-11, BR-11, BR-12)", () => {
  it("serializes simultaneous owner, status, priority, and resolution writes at one shared version", async () => {
    const { requester, staff, ticket } = await setupTicket();
    const results = await Promise.all(mutations.map(({ path, payload }) =>
      mutate(ticket.id, path, path === "resolve-indication" ? requester : staff, { ...payload, expectedVersion: 0 }),
    ));
    expect(results.map(result => result.status).sort()).toEqual([200, 409, 409, 409]);
    const detail = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", staff);
    expect(detail.body.version).toBe(1);
  });

  it("keeps Comments and Internal Notes outside versioning and exposes version on Ticket reads", async () => {
    const { requester, staff, ticket } = await setupTicket();
    const comment = await request(app).post(`/api/tickets/${ticket.id}/comments`).set("Cookie", requester).send({ content: "Public follow-up" });
    const note = await request(app).post(`/api/tickets/${ticket.id}/notes`).set("Cookie", staff).send({ content: "Private diagnosis" });
    expect(comment.status).toBe(201);
    expect(note.status).toBe(201);
    const detail = await request(app).get(`/api/tickets/${ticket.id}`).set("Cookie", requester);
    const list = await request(app).get("/api/tickets").set("Cookie", requester);
    const queue = await request(app).get("/api/staff/tickets").set("Cookie", staff);
    expect(detail.body.version).toBe(0);
    expect(list.body.data[0].version).toBe(0);
    expect(queue.body.items[0].version).toBe(0);
  });

  it("lets a Requester indicate resolution on an OPEN Ticket and invalidates the Staff version", async () => {
    const { requester, staff, ticket } = await setupTicket();
    const opened = await mutate(ticket.id, "status", staff, { status: "OPEN", expectedVersion: 0 });
    expect(opened.body.ticketVersion).toBe(1);
    const indication = await mutate(ticket.id, "resolve-indication", requester, { expectedVersion: 1 });
    expect(indication.status).toBe(200);
    expect(indication.body).toMatchObject({ resolvedByRequester: true, ticketVersion: 2 });
    const staleStaff = await mutate(ticket.id, "status", staff, { status: "IN_PROGRESS", expectedVersion: 1 });
    expect(staleStaff.status).toBe(409);
    const detail = await request(app).get(`/api/tickets/${ticket.id}`).set("Cookie", requester);
    expect(detail.body).toMatchObject({ status: "OPEN", resolvedByRequester: true, version: 2 });
  });
});
