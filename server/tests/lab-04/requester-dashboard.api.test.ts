import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(truncateTransactionalData);
afterAll(() => prisma.$disconnect());
async function login(email = "jennifer.anderson@example.ac.th") {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Password123!" });
  expect(response.status).toBe(200);
  return response.headers["set-cookie"];
}

describe("API-16–API-19 — AC-12, AC-15, AC-16, AC-17", () => {
  it("returns zeros for an authenticated Requester with no Tickets and enforces dashboard roles", async () => {
    const cookie = await login();
    const r = await request(app)
      .get("/api/dashboard/requester")
      .set("Cookie", cookie);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      openTickets: 0,
      waitingForRequester: 0,
      recentlyUpdated: [],
      recentlyResolved: [],
    });
    expect((await request(app).get("/api/dashboard/requester")).status).toBe(
      401,
    );
    expect(
      (await request(app).get("/api/dashboard/staff").set("Cookie", cookie))
        .status,
    ).toBe(403);
    for (const email of [
      "michael.brown@toktickit.com",
      "admin@toktickit.com",
    ]) {
      expect(
        (
          await request(app)
            .get("/api/dashboard/requester")
            .set("Cookie", await login(email))
        ).status,
      ).toBe(403);
    }
  });
});

describe("API-16, API-19 — BR-21, BR-22, BR-23, BR-25", () => {
  it("counts exactly the open/resolved sets, caps recent lists, and scopes all drill-downs to the session", async () => {
    const cookie = await login();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "jennifer.anderson@example.ac.th" },
    });
    const other = await prisma.user.findUniqueOrThrow({
      where: { email: "somchai.prasert@example.ac.th" },
    });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const statuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "REOPENED",
      "RESOLVED",
      "CLOSED",
      "CANCELLED",
    ] as const;
    for (const [index, status] of statuses.entries()) {
      await prisma.ticket.create({
        data: {
          ticketNumber: `DASH-${index}`,
          summary: status,
          description: "Boundary fixture",
          requesterId: user.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "LOW",
          status,
          updatedAt: new Date(2026, 0, index + 1),
        },
      });
    }
    await prisma.ticket.create({
      data: {
        ticketNumber: "PRIVATE",
        summary: "Private Ticket",
        description: "Another Requester",
        requesterId: other.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
      },
    });
    const dashboard = await request(app)
      .get("/api/dashboard/requester")
      .set("Cookie", cookie)
      .set("X-Requester-Id", String(other.id));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body).toMatchObject({
      openTickets: 5,
      waitingForRequester: 1,
    });
    expect(
      dashboard.body.recentlyUpdated.map((t: { summary: string }) => t.summary),
    ).toEqual([
      "CANCELLED",
      "CLOSED",
      "RESOLVED",
      "REOPENED",
      "WAITING_FOR_REQUESTER",
    ]);
    expect(
      dashboard.body.recentlyResolved.map(
        (t: { summary: string }) => t.summary,
      ),
    ).toEqual(["CLOSED", "RESOLVED"]);
    for (const [query, expected] of [
      ["statusGroup=open", 5],
      ["statusGroup=resolved", 2],
      ["status=WAITING_FOR_REQUESTER", 1],
      ["sort=updatedAt&order=desc", 8],
    ] as const) {
      const r = await request(app)
        .get(`/api/tickets?${query}`)
        .set("Cookie", cookie);
      expect(r.status).toBe(200);
      expect(r.body.meta.totalItems).toBe(expected);
      expect(
        r.body.data.some(
          (t: { summary: string }) => t.summary === "Private Ticket",
        ),
      ).toBe(false);
    }
    for (const query of [
      "statusGroup=",
      "statusGroup=invalid",
      "statusGroup=open&status=NEW",
      "statusGroup=open&statusGroup=resolved",
    ]) {
      const r = await request(app)
        .get(`/api/tickets?${query}`)
        .set("Cookie", cookie);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    }
  });
});
