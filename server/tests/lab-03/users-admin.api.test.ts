import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { seedReferenceData, users as seedUsers } from "../../prisma/seed-data";
import { prisma } from "../../src/prisma";
import { truncateTransactionalData } from "../setup/truncate";

const seedEmails = new Set(seedUsers.map((u) => u.email));

async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: Array.from(seedEmails),
      },
    },
  });
  await prisma.user.updateMany({
    where: {
      email: { in: Array.from(seedEmails) },
    },
    data: {
      isActive: true,
    },
  });
  await prisma.user.updateMany({
    where: {
      email: {
        in: [
          "daniel.okafor@example.ac.th",
          "retired.staff@example.ac.th",
          "former.agent@toktickit.com",
        ],
      },
    },
    data: {
      isActive: false,
    },
  });
}

beforeEach(async () => {
  await truncateTransactionalData();
  await cleanupTestUsers();
});

afterEach(async () => {
  await cleanupTestUsers();
});

afterAll(async () => {
  await cleanupTestUsers();
  await seedReferenceData(prisma);
  await prisma.$disconnect();
});

async function loginAs(email: string, password = "Password123!") {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  expect(res.status).toBe(200);
  const cookieHeader = res.headers["set-cookie"];
  const sessionCookie = Array.isArray(cookieHeader)
    ? cookieHeader.find((c) => c.startsWith("toktickit_session="))
    : cookieHeader;
  return {
    user: res.body.user,
    token: res.body.token as string,
    cookie: sessionCookie as string,
  };
}

describe("API-18 — Administrator retrieves user list with search and role filter (AC-16, FR-15)", () => {
  it("retrieves full user list with expected fields ordered by id", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const res = await request(app)
      .get("/api/admin/users")
      .set("Cookie", admin.cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(11);

    const firstUser = res.body[0];
    expect(firstUser).toHaveProperty("id");
    expect(firstUser).toHaveProperty("name");
    expect(firstUser).toHaveProperty("email");
    expect(firstUser).toHaveProperty("role");
    expect(firstUser).toHaveProperty("isActive");
    expect(firstUser).toHaveProperty("mustChangePassword");
    expect(firstUser).toHaveProperty("createdAt");
    expect(firstUser).not.toHaveProperty("passwordHash");
  });

  it("filters users by search substring matching name or email", async () => {
    const admin = await loginAs("admin@toktickit.com");

    // Search by name substring
    const nameRes = await request(app)
      .get("/api/admin/users?search=Jennifer")
      .set("Cookie", admin.cookie);

    expect(nameRes.status).toBe(200);
    expect(nameRes.body.length).toBe(1);
    expect(nameRes.body[0].name).toBe("Jennifer Anderson");

    // Search by email substring case-insensitively
    const emailRes = await request(app)
      .get("/api/admin/users?search=ANDERSON")
      .set("Cookie", admin.cookie);

    expect(emailRes.status).toBe(200);
    expect(emailRes.body.length).toBe(1);
    expect(emailRes.body[0].email).toBe("jennifer.anderson@example.ac.th");
  });

  it("filters users by role", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const staffRes = await request(app)
      .get("/api/admin/users?role=IT_STAFF")
      .set("Cookie", admin.cookie);

    expect(staffRes.status).toBe(200);
    expect(staffRes.body.length).toBeGreaterThan(0);
    for (const u of staffRes.body) {
      expect(u.role).toBe("IT_STAFF");
    }

    const adminRes = await request(app)
      .get("/api/admin/users?role=ADMINISTRATOR")
      .set("Cookie", admin.cookie);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.length).toBe(1);
    expect(adminRes.body[0].role).toBe("ADMINISTRATOR");
  });

  it("combines search and role filters", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const res = await request(app)
      .get("/api/admin/users?search=Michael&role=IT_STAFF")
      .set("Cookie", admin.cookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Michael Brown");
    expect(res.body[0].role).toBe("IT_STAFF");
  });

  it("returns 400 INVALID_QUERY_PARAMETER on invalid query parameter", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const res = await request(app)
      .get("/api/admin/users?role=SUPER_ADMIN")
      .set("Cookie", admin.cookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
  });
});

describe("API-19 — Administrator creates user with duplicate email (AC-17, BR-31)", () => {
  it("creates a new user with initial password and sets mustChangePassword: true", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const newUserData = {
      name: "Alex Thompson",
      email: "alex.thompson@toktickit.com",
      role: "IT_STAFF",
      isActive: true,
      initialPassword: "InitialPass123!",
    };

    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", admin.cookie)
      .send(newUserData);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      id: expect.any(Number),
      name: newUserData.name,
      email: newUserData.email,
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");

    // Check DB
    const dbUser = await prisma.user.findUnique({
      where: { email: newUserData.email },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.mustChangePassword).toBe(true);
    expect(dbUser?.passwordHash).not.toBe(newUserData.initialPassword);
  });

  it("rejects creation with duplicate email with 409 DUPLICATE_EMAIL (case-insensitive)", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const duplicateData = {
      name: "Duplicate Jennifer",
      email: "JENNIFER.ANDERSON@EXAMPLE.AC.TH", // existing seed email in uppercase
      role: "REQUESTER",
      initialPassword: "Password123!",
    };

    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", admin.cookie)
      .send(duplicateData);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: "DUPLICATE_EMAIL",
      message: "A user with this email address already exists.",
    });
  });

  it("rejects creation with initial password shorter than 8 characters (BR-33)", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const shortPassData = {
      name: "Short Pass User",
      email: "short.pass@toktickit.com",
      role: "REQUESTER",
      initialPassword: "short",
    };

    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", admin.cookie)
      .send(shortPassData);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("initialPassword");
  });
});

describe("API-20 — Administrator attempts to deactivate own account (AC-18, BR-29)", () => {
  it("rejects self-deactivation with 400 CANNOT_DEACTIVATE_SELF", async () => {
    const admin = await loginAs("admin@toktickit.com");

    // Create a second active admin so that last active admin protection is not the blocking reason
    await request(app)
      .post("/api/admin/users")
      .set("Cookie", admin.cookie)
      .send({
        name: "Second Admin",
        email: "second.admin@toktickit.com",
        role: "ADMINISTRATOR",
        initialPassword: "InitialPass123!",
      });

    // Current admin attempts to deactivate self
    const patchRes = await request(app)
      .patch(`/api/admin/users/${admin.user.id}`)
      .set("Cookie", admin.cookie)
      .send({ isActive: false });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.error).toMatchObject({
      code: "CANNOT_DEACTIVATE_SELF",
      message: "Administrators cannot deactivate their own accounts.",
    });

    // Account remains active in DB
    const dbAdmin = await prisma.user.findUnique({
      where: { id: admin.user.id },
    });
    expect(dbAdmin?.isActive).toBe(true);
  });
});

describe("API-21 — Administrator attempts to deactivate sole active Admin (AC-19, BR-30)", () => {
  it("rejects deactivating sole active admin with 400 CANNOT_DEACTIVATE_LAST_ADMIN (AC-19, BR-30)", async () => {
    const admin = await loginAs("admin@toktickit.com");

    // In the default seed, admin@toktickit.com is the sole active admin
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    expect(activeAdminCount).toBe(1);

    const deactRes = await request(app)
      .patch(`/api/admin/users/${admin.user.id}`)
      .set("Cookie", admin.cookie)
      .send({ isActive: false });

    expect(deactRes.status).toBe(400);
    expect(deactRes.body.error).toMatchObject({
      code: "CANNOT_DEACTIVATE_LAST_ADMIN",
      message: "Cannot deactivate or demote the last active Administrator.",
    });
  });

  it("rejects changing role of sole active admin with 400 CANNOT_DEACTIVATE_LAST_ADMIN", async () => {
    const admin = await loginAs("admin@toktickit.com");

    // In the default seed, admin@toktickit.com is the sole active admin
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    expect(activeAdminCount).toBe(1);

    // Sole active admin attempts to demote role to IT_STAFF
    const demoteRes = await request(app)
      .patch(`/api/admin/users/${admin.user.id}`)
      .set("Cookie", admin.cookie)
      .send({ role: "IT_STAFF" });

    expect(demoteRes.status).toBe(400);
    expect(demoteRes.body.error).toMatchObject({
      code: "CANNOT_DEACTIVATE_LAST_ADMIN",
      message: "Cannot deactivate or demote the last active Administrator.",
    });
  });

  it("permits role change when another active admin exists", async () => {
    const admin = await loginAs("admin@toktickit.com");

    // Create a second active admin
    const createRes = await request(app)
      .post("/api/admin/users")
      .set("Cookie", admin.cookie)
      .send({
        name: "Second Admin",
        email: "second.admin2@toktickit.com",
        role: "ADMINISTRATOR",
        initialPassword: "InitialPass123!",
      });
    expect(createRes.status).toBe(201);
    const secondAdminId = createRes.body.user.id;

    // Demote the second admin to IT_STAFF
    const patchRes = await request(app)
      .patch(`/api/admin/users/${secondAdminId}`)
      .set("Cookie", admin.cookie)
      .send({ role: "IT_STAFF" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.user.role).toBe("IT_STAFF");
  });

  it("rejects deactivating an admin when only one active admin remains", async () => {
    const admin = await loginAs("admin@toktickit.com");

    // Create a second active admin
    const createRes = await request(app)
      .post("/api/admin/users")
      .set("Cookie", admin.cookie)
      .send({
        name: "Temp Second Admin",
        email: "temp.admin@toktickit.com",
        role: "ADMINISTRATOR",
        initialPassword: "InitialPass123!",
      });
    const secondAdminId = createRes.body.user.id;

    // Clear mustChangePassword for second admin so they can interact with admin routes
    await prisma.user.update({
      where: { id: secondAdminId },
      data: { mustChangePassword: false },
    });

    // Login as second admin
    const secondAdmin = await loginAs("temp.admin@toktickit.com", "InitialPass123!");

    // Deactivate first admin from second admin (now 1 active admin remains: second admin)
    const deactFirst = await request(app)
      .patch(`/api/admin/users/${admin.user.id}`)
      .set("Cookie", secondAdmin.cookie)
      .send({ isActive: false });
    expect(deactFirst.status).toBe(200);

    // Now second admin is the sole active admin. Attempting to demote sole active admin:
    const demoteSole = await request(app)
      .patch(`/api/admin/users/${secondAdminId}`)
      .set("Cookie", secondAdmin.cookie)
      .send({ role: "REQUESTER" });

    expect(demoteSole.status).toBe(400);
    expect(demoteSole.body.error.code).toBe("CANNOT_DEACTIVATE_LAST_ADMIN");
  });
});

describe("API-22 — Administrator resets initial password for a user (AC-20, BR-33)", () => {
  it("resets initial password, updates hash, and marks mustChangePassword: true", async () => {
    const admin = await loginAs("admin@toktickit.com");

    // Target user: create a temporary test user so seed users are not mutated
    const createRes = await request(app)
      .post("/api/admin/users")
      .set("Cookie", admin.cookie)
      .send({
        name: "Reset Target",
        email: "reset.target@toktickit.com",
        role: "REQUESTER",
        initialPassword: "InitialPass123!",
      });
    const targetUserId = createRes.body.user.id;

    // Set mustChangePassword: false to test that resetPassword flips it back to true
    await prisma.user.update({
      where: { id: targetUserId },
      data: { mustChangePassword: false },
    });

    const targetUser = await prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
    });
    expect(targetUser.mustChangePassword).toBe(false);
    const oldHash = targetUser.passwordHash;

    const res = await request(app)
      .post(`/api/admin/users/${targetUser.id}/reset-password`)
      .set("Cookie", admin.cookie)
      .send({ initialPassword: "NewTempPassword789!" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message:
        "Initial password updated. User will be required to change password at next login.",
    });

    // Check DB
    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: targetUser.id },
    });
    expect(updated.mustChangePassword).toBe(true);
    expect(updated.passwordHash).not.toBe(oldHash);

    // Target user can authenticate with the new temporary password
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "reset.target@toktickit.com",
        password: "NewTempPassword789!",
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);
  });

  it("rejects password reset with password shorter than 8 characters", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const res = await request(app)
      .post("/api/admin/users/1/reset-password")
      .set("Cookie", admin.cookie)
      .send({ initialPassword: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 USER_NOT_FOUND when user does not exist", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const res = await request(app)
      .post("/api/admin/users/99999/reset-password")
      .set("Cookie", admin.cookie)
      .send({ initialPassword: "ValidPassword123!" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("returns 400 VALIDATION_FAILED when user ID is invalid", async () => {
    const admin = await loginAs("admin@toktickit.com");

    const res = await request(app)
      .post("/api/admin/users/invalid-id/reset-password")
      .set("Cookie", admin.cookie)
      .send({ initialPassword: "ValidPassword123!" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("API-24 — Database seed idempotency check (BR-36)", () => {
  it("executes seed twice and leaves row counts identical without duplicating rows or throwing errors", async () => {
    // First execution
    const firstCounts = await seedReferenceData(prisma);

    const categoriesCount1 = await prisma.category.count();
    const relatedSystemsCount1 = await prisma.relatedSystem.count();
    const usersCount1 = await prisma.user.count();

    expect(categoriesCount1).toBe(firstCounts.categories);
    expect(relatedSystemsCount1).toBe(firstCounts.relatedSystems);
    expect(usersCount1).toBe(firstCounts.users);

    // Second execution (must succeed without error)
    const secondCounts = await seedReferenceData(prisma);

    const categoriesCount2 = await prisma.category.count();
    const relatedSystemsCount2 = await prisma.relatedSystem.count();
    const usersCount2 = await prisma.user.count();

    expect(secondCounts).toEqual(firstCounts);
    expect(categoriesCount2).toBe(categoriesCount1);
    expect(relatedSystemsCount2).toBe(relatedSystemsCount1);
    expect(usersCount2).toBe(usersCount1);
  });
});
