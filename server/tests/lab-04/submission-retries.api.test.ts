import { readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import app from "../setup/test-app";
import expressApp from "../../src/app";
import { deleteAttachmentFile, UPLOADS_DIR } from "../../src/attachments/storage";
import * as storage from "../../src/attachments/storage";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(truncateTransactionalData);
afterEach(async () => {
  vi.restoreAllMocks();
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
    const write = vi.spyOn(storage, "writeAttachmentFile");
    expect((await send()).body).toEqual(first.body);
    const fresh = await request(app).post(url).set("Cookie", cookie).set("Idempotency-Key", randomUUID()).attach("file", bytes, "fresh.pdf");
    expect(fresh.status).toBe(409);
    expect(write).not.toHaveBeenCalled();
    const list = await request(app).get(url).set("Cookie", cookie);
    expect(list.body.active).toHaveLength(5);
    expect(readdirSync(UPLOADS_DIR)).toHaveLength(initialFiles + 5);
    const invalid = await request(app).post("/api/tickets").set("Cookie", cookie).set("Idempotency-Key", "invalid").send(data);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_FAILED");
    expect(await prisma.ticket.count()).toBe(1);
  });
});

it.each(["category", "system"] as const)("API-29 — replays a committed Ticket after its %s is deactivated", async reference => {
  const { cookie, data } = await fixture();
  const key = randomUUID();
  const send = (id = key) => request(app).post("/api/tickets").set("Cookie", cookie).set("Idempotency-Key", id).send(data);
  const created = await send();
  expect(created.status).toBe(201);
  try {
    if (reference === "category") await prisma.category.update({ where: { id: data.categoryId }, data: { isActive: false } });
    else await prisma.relatedSystem.update({ where: { id: data.relatedSystemId }, data: { isActive: false } });
    const replay = await send();
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(created.body.id);
    expect((await send(randomUUID())).status).toBe(400);
    expect(await prisma.ticket.count()).toBe(1);
  } finally {
    if (reference === "category") await prisma.category.update({ where: { id: data.categoryId }, data: { isActive: true } });
    else await prisma.relatedSystem.update({ where: { id: data.relatedSystemId }, data: { isActive: true } });
  }
});

it("API-29 — preserves committed Attachment bytes when response serialization fails", async () => {
  const { cookie, data } = await fixture();
  const ticket = await request(app).post("/api/tickets").set("Cookie", cookie).send(data);
  const json = expressApp.response.json;
  vi.spyOn(expressApp.response, "json").mockImplementation(function (body) {
    if (this.statusCode === 201) throw new Error("Simulated response failure after commit");
    return json.call(this, body);
  });
  const key = randomUUID(), url = `/api/tickets/${ticket.body.id}/attachments`;
  const bytes = Buffer.from("%PDF-1.4\nCommitted evidence\n%%EOF");
  const failed = await request(app).post(url).set("Cookie", cookie).set("Idempotency-Key", key).attach("file", bytes, "committed.pdf");
  expect(failed.status).toBe(500);
  vi.restoreAllMocks();
  const replay = await request(app).post(url).set("Cookie", cookie).set("Idempotency-Key", key).attach("file", bytes, "committed.pdf");
  expect(replay.status).toBe(201);
  const content = await request(app).get(replay.body.contentUrl).set("Cookie", cookie);
  expect(content.status).toBe(200);
  expect(content.body).toEqual(bytes);
  expect(await prisma.attachment.count()).toBe(1);
});

it("API-29 — removes uncommitted bytes after an Attachment insert rolls back", async () => {
  const { cookie, data } = await fixture();
  const ticket = await request(app).post("/api/tickets").set("Cookie", cookie).send(data);
  const initialFiles = readdirSync(UPLOADS_DIR).length;
  await prisma.$executeRawUnsafe(`ALTER TABLE "Attachment" ADD CONSTRAINT "review_upload_failure" CHECK ("originalFilename" <> 'rollback.pdf')`);
  try {
    const r = await request(app).post(`/api/tickets/${ticket.body.id}/attachments`).set("Cookie", cookie)
      .set("Idempotency-Key", randomUUID()).attach("file", Buffer.from("%PDF-1.4\nRollback\n%%EOF"), "rollback.pdf");
    expect(r.status).toBe(500);
    expect(await prisma.attachment.count()).toBe(0);
    expect(readdirSync(UPLOADS_DIR)).toHaveLength(initialFiles);
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "Attachment" DROP CONSTRAINT "review_upload_failure"');
  }
});

it("API-29 — preserves Attachment bytes when the transaction commits but acknowledgement is lost", async () => {
  const { cookie, data } = await fixture();
  const ticket = await request(app).post("/api/tickets").set("Cookie", cookie).send(data);
  const transaction = prisma.$transaction.bind(prisma);
  vi.spyOn(prisma, "$transaction").mockImplementationOnce(async operation => {
    await transaction(operation);
    throw new Error("Simulated lost commit acknowledgement");
  });
  const key = randomUUID(), url = `/api/tickets/${ticket.body.id}/attachments`;
  const bytes = Buffer.from("%PDF-1.4\nUncertain response\n%%EOF");
  const send = () => request(app).post(url).set("Cookie", cookie).set("Idempotency-Key", key).attach("file", bytes, "uncertain.pdf");
  expect((await send()).status).toBe(500);
  const replay = await send();
  expect(replay.status).toBe(201);
  const content = await request(app).get(replay.body.contentUrl).set("Cookie", cookie);
  expect(content.status).toBe(200);
  expect(content.body).toEqual(bytes);
  expect(await prisma.attachment.count()).toBe(1);
});
