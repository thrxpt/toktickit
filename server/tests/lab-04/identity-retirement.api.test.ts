import { deleteAttachmentFile } from "../../src/attachments/storage";
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
  const response = await request(app).post("/api/auth/login").send({
    email, password: "Password123!",
  });
  expect(response.status).toBe(200);
  return response.headers["set-cookie"];
}

describe("API-26, API-28 — AC-22, BR-29, BR-30", () => {
  it("retires the Requester directory", async () => {
    const response = await request(app).get("/api/requesters");
    expect(response.status).toBe(404);
    expect(response.body).not.toBeInstanceOf(Array);
  });

  it("rejects header-only and expired-session access for every role, including attachment bytes", async () => {
    const users = await prisma.user.findMany({ where: { isActive: true, mustChangePassword: false } });
    for (const user of users) {
      for (const session of [undefined, "toktickit_session=expired"]) {
        for (const [method, path] of [
          ["get", "/api/tickets"], ["post", "/api/tickets"],
          ["get", "/api/attachments/1/content"],
        ] as const) {
          const operation = request(app)[method](path).set("X-Requester-Id", String(user.id));
          if (session) operation.set("Cookie", session);
          const response = await operation;
          expect(response.status).toBe(401);
          expect(response.body.error.code).toBe("UNAUTHENTICATED");
        }
      }
    }
    expect(await prisma.ticket.count()).toBe(0);
  });

  it("uses session ownership and roles even with a conflicting header", async () => {
    const owner = await login("jennifer.anderson@example.ac.th");
    const other = await login("marcus.chen@example.ac.th");
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const marcus = await prisma.user.findUniqueOrThrow({ where: { email: "marcus.chen@example.ac.th" } });
    const created = await request(app).post("/api/tickets").set("Cookie", owner)
      .set("X-Requester-Id", String(marcus.id)).send({
        summary: "Session owns this Ticket", description: "A forged header cannot select ownership.",
        categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM",
      });
    expect(created.status).toBe(201);
    expect(created.body.requester.name).toBe("Jennifer Anderson");
    const uploaded = await request(app).post(`/api/tickets/${created.body.id}/attachments`)
      .set("Cookie", owner).attach("file", Buffer.from("%PDF-1.4\nIdentity evidence\n%%EOF"), "identity.pdf");
    expect(uploaded.status).toBe(201);
    const contentUrl = uploaded.body.contentUrl;
    const ownBytes = await request(app).get(contentUrl).set("Cookie", owner).set("X-Requester-Id", String(marcus.id));
    expect(ownBytes.status).toBe(200);
    const hiddenBytes = await request(app).get(contentUrl).set("Cookie", other)
      .set("X-Requester-Id", String(created.body.requester.id));
    expect(hiddenBytes.status).toBe(404);
    const path = `/api/tickets/${created.body.id}`;
    const hidden = await request(app).get(path).set("Cookie", other)
      .set("X-Requester-Id", String(created.body.requester.id));
    expect(hidden.status).toBe(404);
    for (const email of ["michael.brown@toktickit.com", "admin@toktickit.com"]) {
      const cookie = await login(email);
      const denied = await request(app).get("/api/tickets").set("Cookie", cookie)
        .set("X-Requester-Id", String(created.body.requester.id));
      expect(denied.status).toBe(403);
      const permitted = await request(app).get(contentUrl).set("Cookie", cookie)
        .set("X-Requester-Id", String(marcus.id));
      expect(permitted.status).toBe(200);
    }
  });
});
