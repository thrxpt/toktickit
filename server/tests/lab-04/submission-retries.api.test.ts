import { readdirSync } from "node:fs";
import { deleteAttachmentFile, UPLOADS_DIR } from "../../src/attachments/storage";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import app from "../setup/test-app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(truncateTransactionalData);
afterEach(async () => {
  for (const file of await prisma.attachment.findMany({ select: { storageKey: true } })) {
    await deleteAttachmentFile(file.storageKey);
  }
});
afterAll(() => prisma.$disconnect());

async function login(email: string) {
  const r = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  expect(r.status).toBe(200);
  return r.headers["set-cookie"];
}
async function fixture() {
  const cookie = await login("jennifer.anderson@example.ac.th");
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  return { cookie, data: { summary: "Retry-safe Ticket", description: "Keep one record when a response is lost.",
    categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM" } };
}

describe("API-29 — FR-19, FR-20: retries of unversioned creates", () => {
  it("replays concurrent and sequential Ticket submissions and isolates sessions", async () => {
    const { cookie, data } = await fixture();
    const key = randomUUID();
    const send = () => request(app).post("/api/tickets").set("Cookie", cookie).set("Idempotency-Key", key).send(data);
    const replies = await Promise.all([send(), send()]);
    const retry = await send();
    for (const r of [...replies, retry]) {
      expect(r.status).toBe(201);
      expect(r.body).toEqual(replies[0].body);
      expect(r.headers.location).toBe(`/api/tickets/${r.body.id}`);
      expect(r.body).not.toHaveProperty("submissionKey");
    }
    expect(await prisma.ticket.count()).toBe(1);
    const other = await login("marcus.chen@example.ac.th");
    const distinct = await request(app).post("/api/tickets").set("Cookie", other).set("Idempotency-Key", key).send(data);
    expect(distinct.status).toBe(201);
    expect(distinct.body.id).not.toBe(retry.body.id);
  });

  it("replays discussion creates without duplicating or bumping the Ticket version", async () => {
    const { cookie, data } = await fixture();
    const ticket = await request(app).post("/api/tickets").set("Cookie", cookie).send(data);
    const staff = await login("michael.brown@toktickit.com");
    for (const resource of ["comments", "notes"]) {
      const key = randomUUID();
      const url = `/api/tickets/${ticket.body.id}/${resource}`;
      const send = () => request(app).post(url).set("Cookie", staff).set("Idempotency-Key", key).send({ content: "Shared work discussion" });
      const [first, second] = await Promise.all([send(), send()]);
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(second.body).toEqual(first.body);
      expect((await send()).body).toEqual(first.body);
      const list = await request(app).get(url).set("Cookie", staff);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).not.toHaveProperty("submissionKey");
    }
    const latest = await request(app).get(`/api/tickets/${ticket.body.id}`).set("Cookie", cookie);
    expect(latest.body.version).toBe(0);
  });

  it("replays an upload at the active-file limit and validates the key without writing", async () => {
    const { cookie, data } = await fixture();
    const ticket = await request(app).post("/api/tickets").set("Cookie", cookie).send(data);
    const url = `/api/tickets/${ticket.body.id}/attachments`;
    const initialFiles = readdirSync(UPLOADS_DIR).length;
    const bytes = Buffer.from("%PDF-1.4\nRetry evidence\n%%EOF");
    for (let index = 0; index < 4; index++) {
      const r = await request(app).post(url).set("Cookie", cookie).attach("file", bytes, `evidence-${index}.pdf`);
      expect(r.status).toBe(201);
    }
    const key = randomUUID();
    const send = () => request(app).post(url).set("Cookie", cookie).set("Idempotency-Key", key).attach("file", bytes, "retry.pdf");
    const [first, second] = await Promise.all([send(), send()]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect((await send()).body).toEqual(first.body);
    const list = await request(app).get(url).set("Cookie", cookie);
    expect(list.body.active).toHaveLength(5);
    expect(readdirSync(UPLOADS_DIR)).toHaveLength(initialFiles + 5);
    const invalid = await request(app).post("/api/tickets").set("Cookie", cookie).set("Idempotency-Key", "invalid").send(data);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_FAILED");
    expect(await prisma.ticket.count()).toBe(1);
  });
});
