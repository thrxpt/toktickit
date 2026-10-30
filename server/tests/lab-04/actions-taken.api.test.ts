import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(truncateTransactionalData);
afterAll(() => prisma.$disconnect());
async function login(email: string) {
  const r = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  expect(r.status).toBe(200);
  return r.headers["set-cookie"];
}
async function setup() {
  const requester = await login("jennifer.anderson@example.ac.th");
  const staff = await login("michael.brown@toktickit.com");
  const category = await prisma.category.findFirstOrThrow();
  const system = await prisma.relatedSystem.findFirstOrThrow();
  const r = await request(app).post("/api/tickets").set("Cookie", requester).send({
    summary: "Actions Taken test", description: "Record work performed on this Ticket.",
    categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM",
  });
  expect(r.status).toBe(201);
  return { requester, staff, id: r.body.id as number };
}
const payload = { description: "  Checked battery  ", result: "  Battery healthy  ", expectedVersion: 0 };
const url = (id: number) => `/api/tickets/${id}/actions`;

describe("API-01 — AC-01, BR-01, BR-03", () => {
  it("records work on an unassigned Ticket and exposes it to its Requester", async () => {
    const { requester, staff, id } = await setup();
    const r = await request(app).post(url(id)).set("Cookie", staff).send(payload);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ ticketVersion: 1, action: {
      ticketId: id, description: "Checked battery", result: "Battery healthy",
      performedBy: { name: "Michael Brown", role: "IT_STAFF" },
      followUpRequired: false, followUpNote: null, attachmentNotes: null,
    } });
    expect(r.body.action).not.toHaveProperty("seedKey");
    const list = await request(app).get(url(id)).set("Cookie", requester);
    expect(list.status).toBe(200);
    expect(list.body).toEqual([r.body.action]);
  });
});

describe("API-02–API-07, API-27 — AC-02–AC-08, AC-26", () => {
  it("validates both follow-up directions and rejects immutable and seed-only fields", async () => {
    const { staff, id } = await setup();
    for (const body of [
      { followUpRequired: true }, { followUpRequired: false, followUpNote: "Monitor" },
      ...["performedBy", "performedById", "createdAt", "seedKey", "updatedAt"].map(key => ({ [key]: "forged" })),
      { description: " " }, { result: "x".repeat(2001) }, { attachmentNotes: "x".repeat(1001) },
      ...[undefined, -1, 0.5, "0", null].map(expectedVersion => ({ expectedVersion })),
    ]) {
      const r = await request(app).post(url(id)).set("Cookie", staff).send({ ...payload, ...body });
      expect(r.status).toBe(400);
      expect(r.body.error).toMatchObject({ code: "VALIDATION_FAILED", fields: expect.any(Object) });
    }
    expect((await request(app).get(url(id)).set("Cookie", staff)).body).toEqual([]);
  });

  it("lets another staff member and Administrator edit while preserving attribution and omitted optional fields", async () => {
    const { staff, id } = await setup();
    const created = await request(app).post(url(id)).set("Cookie", staff).send({ ...payload,
      followUpRequired: true, followUpNote: "Monitor battery", attachmentNotes: "See existing photo",
    });
    const admin = await login("admin@toktickit.com");
    const path = `${url(id)}/${created.body.action.id}`;
    for (const field of ["performedBy", "performedById", "createdAt", "seedKey"]) {
      const r = await request(app).patch(path).set("Cookie", admin).send({ ...payload, expectedVersion: 1, [field]: "forged" });
      expect(r.status).toBe(400);
      expect(r.body.error.fields).toHaveProperty(field);
    }
    const edited = await request(app).patch(path).set("Cookie", admin).send({ ...payload, result: "Rechecked", expectedVersion: 1 });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ ticketVersion: 2, action: {
      performedBy: created.body.action.performedBy, createdAt: created.body.action.createdAt,
      followUpRequired: true, followUpNote: "Monitor battery", attachmentNotes: "See existing photo",
    } });
    expect(edited.body.action).not.toHaveProperty("seedKey");
    const sarah = await login("sarah.johnson@toktickit.com");
    const cleared = await request(app).patch(path).set("Cookie", sarah).send({ ...payload, expectedVersion: 2, followUpRequired: false });
    expect(cleared.status).toBe(200);
    expect(cleared.body.action.followUpNote).toBeNull();
    const stale = await request(app).patch(path).set("Cookie", staff).send({ ...payload, expectedVersion: 2 });
    expect(stale.status).toBe(409);
    expect((await request(app).get(url(id)).set("Cookie", staff)).body).toEqual([cleared.body.action]);
    const added = await request(app).post(url(id)).set("Cookie", admin).send({ ...payload, expectedVersion: 3 });
    expect(added.status).toBe(201);
    expect(added.body.action.performedBy.role).toBe("ADMINISTRATOR");
  });

  it("enforces authentication, Requester read ownership and write prohibition, and safe missing-resource errors", async () => {
    const { requester, staff, id } = await setup();
    const other = await login("marcus.chen@example.ac.th");
    for (const method of ["get", "post", "patch"] as const) {
      const path = method === "patch" ? `${url(id)}/999999` : url(id);
      expect((await request(app)[method](path).send(payload)).status).toBe(401);
      if (method !== "get") {
        expect((await request(app)[method](path).set("Cookie", requester).send(payload)).status).toBe(403);
      }
    }
    expect((await request(app).get(url(id)).set("Cookie", other)).status).toBe(404);
    expect((await request(app).get(url(id)).set("Cookie", requester)).body).toEqual([]);
    for (const ticketId of ["999999", "bad"]) {
      const r = await request(app).get(`/api/tickets/${ticketId}/actions`).set("Cookie", staff);
      expect(r.body.error.code).toBe("TICKET_NOT_FOUND");
    }
    const created = await request(app).post(url(id)).set("Cookie", staff).send(payload);
    const second = await setup();
    for (const actionId of [created.body.action.id, "bad", 999999]) {
      const r = await request(app).patch(`${url(second.id)}/${actionId}`).set("Cookie", staff).send(payload);
      expect(r.status).toBe(404);
      expect(r.body).toEqual({ error: { code: "ACTION_TAKEN_NOT_FOUND", message: "Action taken not found" } });
    }
  });

  it.each([true, false])("creates one action with one version increment (concurrent=%s)", async concurrent => {
    const { staff, id } = await setup();
    const create = () => request(app).post(url(id)).set("Cookie", staff).send(payload);
    const results = concurrent ? await Promise.all([create(), create()]) : [await create(), await create()];
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    expect(results.find(r => r.status === 409)!.body.error.code).toBe("STALE_UPDATE");
    const list = await request(app).get(url(id)).set("Cookie", staff);
    expect(list.body).toHaveLength(1);
    const detail = await request(app).get(`/api/tickets/${id}`).set("Cookie", await login("jennifer.anderson@example.ac.th"));
    expect(detail.body.version).toBe(1);
  });

  it("lists by creation time then id even after an earlier action is edited", async () => {
    const { staff, id } = await setup();
    const first = await request(app).post(url(id)).set("Cookie", staff).send(payload);
    const second = await request(app).post(url(id)).set("Cookie", staff).send({ ...payload, expectedVersion: 1 });
    // Equal Action Date/Time exercises the stable id tie-breaker.
    await prisma.actionTaken.update({ where: { id: second.body.action.id }, data: { createdAt: first.body.action.createdAt } });
    await request(app).patch(`${url(id)}/${first.body.action.id}`).set("Cookie", staff).send({ ...payload, result: "Edited", expectedVersion: 2 });
    const list = await request(app).get(url(id)).set("Cookie", staff);
    expect(list.body.map((a: { id: number }) => a.id)).toEqual([first.body.action.id, second.body.action.id]);
  });

  it.each(["post", "patch"] as const)("rolls back Ticket and action on a real database %s failure, allowing retry", async method => {
    const { staff, requester, id } = await setup();
    const created = method === "patch" ? await request(app).post(url(id)).set("Cookie", staff).send(payload) : null;
    const path = created ? `${url(id)}/${created.body.action.id}` : url(id);
    const expectedVersion = created ? 1 : 0;
    const before = await request(app).get(url(id)).set("Cookie", staff);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ActionTaken" ADD CONSTRAINT "test_action_failure" CHECK ("result" <> 'force database failure')`);
    try {
      const failed = await request(app)[method](path).set("Cookie", staff).send({ ...payload, result: "force database failure", expectedVersion });
      expect(failed.status).toBe(500);
      expect(failed.body).toEqual({ error: { code: "DATABASE_UNAVAILABLE", message: "Unable to reach the database" } });
      expect((await request(app).get(url(id)).set("Cookie", staff)).body).toEqual(before.body);
      expect((await request(app).get(`/api/tickets/${id}`).set("Cookie", requester)).body.version).toBe(expectedVersion);
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "ActionTaken" DROP CONSTRAINT "test_action_failure"');
    }
    expect((await request(app)[method](path).set("Cookie", staff).send({ ...payload, expectedVersion })).status).toBe(method === "post" ? 201 : 200);
  });
});
