import request from "supertest";
import { expect } from "vitest";

import app from "./test-app";
import { prisma } from "../../src/prisma";

// Legacy Ticket assertions now run through the real login/session boundary (BR-30).
export async function requesterSession(id: number): Promise<string[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  const response = await request(app).post("/api/auth/login").send({
    email: user.email, password: "Password123!",
  });
  expect(response.status).toBe(200);
  return response.headers["set-cookie"] as unknown as string[];
}
