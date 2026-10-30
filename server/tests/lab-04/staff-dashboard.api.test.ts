import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";
beforeEach(truncateTransactionalData);
afterAll(() => prisma.$disconnect());
async function login(email: string) {
  const r = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Password123!" });
  expect(r.status).toBe(200);
  return r.headers["set-cookie"];
}
describe("API-20–API-24 — AC-13, AC-14, AC-17, BR-24", () => {
  it("returns all zero metric keys, omits accounts for staff, and includes authoritative accounts for Administrator", async () => {
    for (const email of [
      "michael.brown@toktickit.com",
      "admin@toktickit.com",
    ]) {
      const cookie = await login(email);
      const r = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", cookie);
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({
        unassigned: 0,
        ownedByMe: 0,
        recentlyUpdated: [],
        byStatus: {
          NEW: 0,
          OPEN: 0,
          IN_PROGRESS: 0,
          WAITING_FOR_REQUESTER: 0,
          RESOLVED: 0,
          CLOSED: 0,
          REOPENED: 0,
          CANCELLED: 0,
        },
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      });
      if (email.startsWith("admin")) {
        expect(r.body.userCounts.total).toBe(await prisma.user.count());
        expect(r.body.userCounts.active).toBe(
          await prisma.user.count({ where: { isActive: true } }),
        );
        expect(r.body.userCounts.inactive).toBe(
          await prisma.user.count({ where: { isActive: false } }),
        );
        for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const)
          expect(r.body.userCounts.byRole[role]).toBe(
            await prisma.user.count({ where: { role } }),
          );
      } else expect(r.body).not.toHaveProperty("userCounts");
    }
  });
  it("matches authoritative counts and limits recent Tickets in updated order", async () => {
    const cookie = await login("michael.brown@toktickit.com");
    const staff = await prisma.user.findUniqueOrThrow({
      where: { email: "michael.brown@toktickit.com" },
    });
    const requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER" },
    });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    for (let i = 0; i < 7; i++)
      await prisma.ticket.create({
        data: {
          ticketNumber: `STAFF-${i}`,
          summary: `Ticket ${i}`,
          description: "Dashboard fixture",
          requesterId: requester.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "LOW",
          itPriority: i % 2 ? "CRITICAL" : "LOW",
          ticketOwnerId: i % 2 ? staff.id : null,
          updatedAt: new Date(2026, 0, i + 1),
        },
      });
    const r = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      unassigned: 4,
      ownedByMe: 3,
      byStatus: { NEW: 7 },
      byPriority: { LOW: 4, CRITICAL: 3 },
    });
    expect(
      r.body.recentlyUpdated.map((t: { summary: string }) => t.summary),
    ).toEqual(["Ticket 6", "Ticket 5", "Ticket 4", "Ticket 3", "Ticket 2"]);
    expect(r.body.recentlyUpdated[0].owner).toBeNull();
    expect(r.body.recentlyUpdated[1].owner).toEqual({
      id: staff.id,
      name: staff.name,
    });
    for (const query of [
      "owner=unassigned",
      "owner=me",
      "status=NEW",
      "priority=CRITICAL",
      "sortBy=updatedAt&sortOrder=desc",
    ])
      expect(
        (
          await request(app)
            .get(`/api/staff/tickets?${query}`)
            .set("Cookie", cookie)
        ).status,
      ).toBe(200);
  });
});

it("API-24 — AC-13: demo dashboard meets the local 500 ms budget", async () => {
  const { seedReferenceData } = await import("../../prisma/seed-data");
  await seedReferenceData(prisma);
  const cookie = await login("michael.brown@toktickit.com");
  let elapsed = Infinity;
  for (let attempt = 0; attempt < 2; attempt++) {
    const start = performance.now();
    const r = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);
    elapsed = performance.now() - start;
    expect(r.status).toBe(200);
    if (elapsed < 500) break;
  }
  expect(elapsed).toBeLessThan(500);
});

it("API-21, API-25 — FR-14, BR-28: account query failure preserves ticket metrics; ticket failure stays safe", async () => {
  const cookie = await login("admin@toktickit.com");
  const accounts = vi
    .spyOn(prisma.user, "groupBy")
    .mockRejectedValueOnce(new Error("private SQL path"));
  try {
    const partial = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);
    expect(partial.status).toBe(200);
    expect(partial.body).toMatchObject({
      unassigned: 0,
      ownedByMe: 0,
      recentlyUpdated: [],
    });
    expect(partial.body).not.toHaveProperty("userCounts");
    expect(JSON.stringify(partial.body)).not.toContain("private");
  } finally {
    accounts.mockRestore();
  }
  const tickets = vi
    .spyOn(prisma.ticket, "count")
    .mockRejectedValueOnce(new Error("private SQL path"));
  try {
    const failure = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);
    expect(failure.status).toBe(500);
    expect(failure.body.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(JSON.stringify(failure.body)).not.toContain("private");
  } finally {
    tickets.mockRestore();
  }
});
