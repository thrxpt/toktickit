import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

beforeEach(async () => {
  await truncateTransactionalData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API-01 — Login with valid credentials (AC-01, BR-01)", () => {
  it("authenticates active IT Staff, sets session cookie, returns token and profile", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "michael.brown@toktickit.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: expect.any(Number),
        name: "Michael Brown",
        email: "michael.brown@toktickit.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      },
      token: expect.any(String),
    });

    const cookieHeader = response.headers["set-cookie"];
    expect(cookieHeader).toBeDefined();
    const sessionCookie = Array.isArray(cookieHeader)
      ? cookieHeader.find((c) => c.startsWith("toktickit_session="))
      : cookieHeader;
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("Path=/");
    expect(sessionCookie).toContain("SameSite=Lax");
  });

  it("authenticates case-insensitively for email (BR-31)", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "MICHAEL.BROWN@toktickit.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("michael.brown@toktickit.com");
  });

  it("authenticates active Requester and returns role REQUESTER", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@example.ac.th",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("REQUESTER");
  });
});

describe("API-25 — Login with incorrect password (AC-01, BR-09)", () => {
  it("returns generic 401 INVALID_CREDENTIALS for wrong password without setting cookie", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "michael.brown@toktickit.com",
      password: "WrongPassword999!",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      },
    });

    const cookieHeader = response.headers["set-cookie"];
    const sessionCookie = Array.isArray(cookieHeader)
      ? cookieHeader.find((c) => c.startsWith("toktickit_session="))
      : undefined;
    expect(sessionCookie).toBeUndefined();
  });

  it("returns identical generic 401 error for non-existent email preventing user enumeration (BR-09)", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "nonexistent.user@toktickit.com",
      password: "Password123!",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      },
    });
  });
});

describe("API-02 — Login with inactive user account (AC-04, BR-10)", () => {
  it("rejects inactive IT Staff with 401 ACCOUNT_INACTIVE", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "former.agent@toktickit.com",
      password: "Password123!",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "ACCOUNT_INACTIVE",
        message: "Account is deactivated. Please contact an administrator.",
      },
    });
  });

  it("rejects inactive Requester with 401 ACCOUNT_INACTIVE", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "daniel.okafor@example.ac.th",
      password: "Password123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("ACCOUNT_INACTIVE");
  });
});

describe("API-03 — User with mustChangePassword accessing protected API (AC-02, BR-02)", () => {
  it("blocks user with mustChangePassword: true from protected business routes with 403", async () => {
    // Somchai Prasert is seeded with mustChangePassword: true
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "somchai.prasert@example.ac.th",
      password: "Password123!",
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);

    const token = loginRes.body.token;

    // Attempt to access protected tickets route with Authorization Bearer header
    const protectedRes = await request(app)
      .get("/api/tickets")
      .set("Authorization", `Bearer ${token}`);

    expect(protectedRes.status).toBe(403);
    expect(protectedRes.body).toEqual({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Password change is required before continuing.",
      },
    });
  });

  it("allows user with mustChangePassword: true to access /api/auth/me", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "somchai.prasert@example.ac.th",
      password: "Password123!",
    });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.mustChangePassword).toBe(true);
    expect(meRes.body.user.email).toBe("somchai.prasert@example.ac.th");
  });
});

describe("API-04 — Successful mandatory password change (AC-03, BR-12)", () => {
  it("updates password, clears mustChangePassword, unlocks protected API", async () => {
    // Reset somchai to known initial state
    await prisma.user.update({
      where: { email: "somchai.prasert@example.ac.th" },
      data: { mustChangePassword: true },
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "somchai.prasert@example.ac.th",
      password: "Password123!",
    });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    // Change password to a compliant new password
    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "BrandNewSecurePass456!",
        confirmPassword: "BrandNewSecurePass456!",
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body).toEqual({
      user: {
        id: expect.any(Number),
        name: "Somchai Prasert",
        email: "somchai.prasert@example.ac.th",
        role: "REQUESTER",
        mustChangePassword: false,
      },
      message: "Password changed successfully.",
    });

    // Database record has mustChangePassword set to false
    const dbUser = await prisma.user.findUnique({
      where: { email: "somchai.prasert@example.ac.th" },
    });
    expect(dbUser?.mustChangePassword).toBe(false);

    // Old password no longer works
    const oldLogin = await request(app).post("/api/auth/login").send({
      email: "somchai.prasert@example.ac.th",
      password: "Password123!",
    });
    expect(oldLogin.status).toBe(401);

    // New password works
    const newLogin = await request(app).post("/api/auth/login").send({
      email: "somchai.prasert@example.ac.th",
      password: "BrandNewSecurePass456!",
    });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.mustChangePassword).toBe(false);

    // Restore somchai's password for subsequent tests
    const defaultHash = (
      await prisma.user.findUnique({
        where: { email: "jennifer.anderson@example.ac.th" },
      })
    )?.passwordHash;
    if (defaultHash) {
      await prisma.user.update({
        where: { email: "somchai.prasert@example.ac.th" },
        data: {
          passwordHash: defaultHash,
          mustChangePassword: true,
        },
      });
    }
  });

  it("fails password change when current password is wrong (401)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "michael.brown@toktickit.com",
      password: "Password123!",
    });

    const token = loginRes.body.token;

    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "WrongCurrentPassword123!",
        newPassword: "BrandNewSecurePass456!",
        confirmPassword: "BrandNewSecurePass456!",
      });

    expect(changeRes.status).toBe(401);
    expect(changeRes.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("fails password change when new password equals current password (400)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "michael.brown@toktickit.com",
      password: "Password123!",
    });

    const token = loginRes.body.token;

    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "Password123!",
        confirmPassword: "Password123!",
      });

    expect(changeRes.status).toBe(400);
    expect(changeRes.body.error.code).toBe("VALIDATION_FAILED");
    expect(changeRes.body.error.fields.newPassword).toBeDefined();
  });

  it("fails password change when confirmation does not match (400)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "michael.brown@toktickit.com",
      password: "Password123!",
    });

    const token = loginRes.body.token;

    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "BrandNewSecurePass456!",
        confirmPassword: "DifferentConfirmation789!",
      });

    expect(changeRes.status).toBe(400);
    expect(changeRes.body.error.code).toBe("VALIDATION_FAILED");
    expect(changeRes.body.error.fields.confirmPassword).toBeDefined();
  });
});

describe("API-05 — Logout endpoint execution (AC-05, BR-11)", () => {
  it("clears session cookie on logout and subsequent requests answer 401", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "michael.brown@toktickit.com",
      password: "Password123!",
    });

    expect(loginRes.status).toBe(200);

    const cookieHeader = loginRes.headers["set-cookie"];
    const rawCookie = Array.isArray(cookieHeader)
      ? cookieHeader[0]
      : cookieHeader;

    // Logout request
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", rawCookie || "");

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toEqual({ message: "Logged out successfully." });

    // Cookie header on logout clears the cookie
    const logoutCookie = logoutRes.headers["set-cookie"];
    expect(logoutCookie).toBeDefined();

    // Subsequent request without credentials fails with 401 UNAUTHENTICATED
    const meRes = await request(app).get("/api/auth/me");
    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("API-23 — Error envelopes conform to standard schema (AC-21, BR-35)", () => {
  it("returns standard error envelope on unauthenticated request", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toHaveProperty("code", "UNAUTHENTICATED");
    expect(response.body.error).toHaveProperty("message");
    expect(response.body.error.message).toBe("Authentication required.");
    expect(response.body).not.toHaveProperty("stack");
    expect(response.body).not.toHaveProperty("prisma");
  });

  it("returns standard error envelope with fields on login validation failure", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
      // missing password
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "VALIDATION_FAILED",
      message: "One or more fields are invalid.",
      fields: {
        email: "A valid email address is required.",
        password: "Password is required.",
      },
    });
  });

  it("returns standard error envelope with fields on change-password validation failure", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "michael.brown@toktickit.com",
      password: "Password123!",
    });
    const token = loginRes.body.token;

    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "short",
        confirmPassword: "short",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(response.body.error.fields).toBeDefined();
    expect(response.body.error.fields.newPassword).toBeDefined();
  });
});
