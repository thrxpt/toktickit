import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/prisma";

const categoryNames = ["Account and Access", "Hardware", "Software", "Network"];

describe("API-02 — GET /api/categories", () => {
  beforeAll(async () => {
    for (const name of categoryNames) {
      await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the four seeded categories in ascending id order", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.map((category: { name: string }) => category.name)).toEqual(
      expect.arrayContaining(categoryNames),
    );

    const ids = response.body.map((category: { id: number }) => category.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));

    for (const category of response.body) {
      expect(category).toEqual({ id: expect.any(Number), name: expect.any(String) });
    }
  });
});
