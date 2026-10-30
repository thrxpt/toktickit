import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedReferenceData } from "../../prisma/seed-data";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(async () => {
  await truncateTransactionalData();
  await prisma.user.deleteMany({ where: { email: "e2e.action-cleanup@example.test" } });
});
afterAll(() => prisma.$disconnect());
describe("API-22 — AC-21, BR-26 demo seed", () => {
  it("converges on stable Ticket/action ids with all statuses, priorities, owners and zero/one/many actions", async () => {
    await seedReferenceData(prisma);
    const snapshot = () => prisma.ticket.findMany({ orderBy: { id: "asc" }, include: { actionsTaken: { orderBy: { id: "asc" } } } });
    const first = await snapshot();
    expect(new Set(first.map(t => t.status)).size).toBe(8);
    expect(new Set(first.map(t => t.itPriority)).size).toBe(4);
    expect(first.some(t => t.ticketOwnerId === null)).toBe(true);
    expect(new Set(first.flatMap(t => t.ticketOwnerId === null ? [] : [t.ticketOwnerId])).size).toBeGreaterThanOrEqual(2);
    for (const count of [0, 1, 3]) expect(first.some(t => t.actionsTaken.length === count)).toBe(true);
    const many = first.find(t => t.actionsTaken.length === 3)!;
    expect(new Set(many.actionsTaken.map(a => a.performedById)).size).toBeGreaterThanOrEqual(2);
    expect(many.actionsTaken[0].description).toBe(many.actionsTaken[1].description);
    const emptyRequester = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true, submittedTickets: { none: {} } } });
    expect(emptyRequester).not.toBeNull();
    await seedReferenceData(prisma);
    const second = await snapshot();
    expect(second.map(t => [t.id, t.ticketNumber, t.actionsTaken.map(a => [a.id, a.seedKey])])).toEqual(first.map(t => [t.id, t.ticketNumber, t.actionsTaken.map(a => [a.id, a.seedKey])]));
  });
});

describe("API-23 (Issue 24) — BR-26, BR-27 E2E cleanup baseline", () => {
  it("deletes an E2E Ticket with Actions Taken child-first and restores the demo seed", async () => {
    await seedReferenceData(prisma);
    const demo = await prisma.ticket.findFirstOrThrow();
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const e2e = await prisma.ticket.create({ data: {
      ticketNumber: "TKT-2026-999999", summary: "E2E Action cleanup", description: "Test residue",
      requestedPriority: "LOW", requesterId: demo.requesterId, categoryId: demo.categoryId, relatedSystemId: demo.relatedSystemId,
      actionsTaken: { create: { description: "E2E work", result: "Done", performedById: staff.id } },
    } });
    const temporaryPerformer = await prisma.user.create({ data: {
      name: "E2E temporary staff", email: "e2e.action-cleanup@example.test", passwordHash: "unused", role: "IT_STAFF",
    } });
    await prisma.actionTaken.create({ data: {
      ticketId: demo.id, performedById: temporaryPerformer.id, description: "Checked demo Ticket", result: "E2E work",
    } });
    await prisma.actionTaken.updateMany({ where: { seedKey: { not: null } }, data: { result: "Changed during E2E" } });
    execFileSync(fileURLToPath(new URL("../../node_modules/.bin/tsx", import.meta.url)), ["prisma/cleanup-e2e.ts"], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)), env: process.env,
    });
    expect(await prisma.ticket.findUnique({ where: { id: e2e.id } })).toBeNull();
    expect(await prisma.actionTaken.count({ where: { ticketId: e2e.id } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: temporaryPerformer.id } })).toBeNull();
    expect(await prisma.ticket.count()).toBe(8);
    expect(await prisma.actionTaken.count()).toBe(4);
    expect(await prisma.actionTaken.count({ where: { result: "Changed during E2E" } })).toBe(0);
    await truncateTransactionalData();
    expect(await prisma.actionTaken.count()).toBe(0);
    expect(await prisma.ticket.count()).toBe(0);
  });
});
