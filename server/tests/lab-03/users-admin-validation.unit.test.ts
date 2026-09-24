import { describe, expect, it } from "vitest";

import {
  adminUserQuerySchema,
  createAdminUserSchema,
  patchAdminUserSchema,
  resetPasswordSchema,
} from "../../src/admin/users-admin.schema";

describe("UNIT-06 — User administration validation schemas (AC-16, AC-17, BR-13, BR-31, BR-33, FR-16, FR-17, FR-18)", () => {
  describe("adminUserQuerySchema (AC-16, FR-15)", () => {
    it("accepts empty query parameters", () => {
      const result = adminUserQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
        expect(result.data.role).toBeUndefined();
      }
    });

    it("accepts valid search string and role", () => {
      const result = adminUserQuerySchema.safeParse({
        search: "  alex  ",
        role: "IT_STAFF",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("alex");
        expect(result.data.role).toBe("IT_STAFF");
      }
    });

    it("transforms empty search string or empty role to undefined", () => {
      const result = adminUserQuerySchema.safeParse({
        search: "   ",
        role: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
        expect(result.data.role).toBeUndefined();
      }
    });

    it("rejects search longer than 150 characters", () => {
      const result = adminUserQuerySchema.safeParse({
        search: "a".repeat(151),
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid role value", () => {
      const result = adminUserQuerySchema.safeParse({
        role: "SUPERUSER",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unrecognized query parameters", () => {
      const result = adminUserQuerySchema.safeParse({
        unknownParam: "value",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createAdminUserSchema (AC-17, BR-13, BR-31, BR-33, FR-16)", () => {
    const validUser = {
      name: "Alex Thompson",
      email: "alex.thompson@toktickit.com",
      role: "IT_STAFF",
      initialPassword: "InitialPass123!",
    };

    it("accepts valid creation payload and defaults isActive to true", () => {
      const result = createAdminUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Alex Thompson");
        expect(result.data.email).toBe("alex.thompson@toktickit.com");
        expect(result.data.role).toBe("IT_STAFF");
        expect(result.data.isActive).toBe(true);
        expect(result.data.initialPassword).toBe("InitialPass123!");
      }
    });

    it("normalizes email to lowercase and trims name", () => {
      const result = createAdminUserSchema.safeParse({
        ...validUser,
        name: "  Sarah Connor  ",
        email: "  SARAH.CONNOR@EXAMPLE.COM  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Sarah Connor");
        expect(result.data.email).toBe("sarah.connor@example.com");
      }
    });

    it("accepts explicit isActive: false", () => {
      const result = createAdminUserSchema.safeParse({
        ...validUser,
        isActive: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(false);
      }
    });

    it("rejects name shorter than 2 characters or longer than 100 characters", () => {
      expect(
        createAdminUserSchema.safeParse({ ...validUser, name: "A" }).success,
      ).toBe(false);
      expect(
        createAdminUserSchema.safeParse({ ...validUser, name: "a".repeat(101) })
          .success,
      ).toBe(false);
    });

    it("rejects invalid email formats", () => {
      expect(
        createAdminUserSchema.safeParse({ ...validUser, email: "not-an-email" })
          .success,
      ).toBe(false);
      expect(
        createAdminUserSchema.safeParse({ ...validUser, email: "" }).success,
      ).toBe(false);
    });

    it("rejects invalid role (BR-13)", () => {
      expect(
        createAdminUserSchema.safeParse({ ...validUser, role: "MANAGER" })
          .success,
      ).toBe(false);
    });

    it("rejects initial password shorter than 8 characters (BR-33)", () => {
      expect(
        createAdminUserSchema.safeParse({
          ...validUser,
          initialPassword: "short",
        }).success,
      ).toBe(false);
      expect(
        createAdminUserSchema.safeParse({
          ...validUser,
          initialPassword: "1234567",
        }).success,
      ).toBe(false);
    });

    it("rejects unrecognized properties", () => {
      expect(
        createAdminUserSchema.safeParse({
          ...validUser,
          extraField: "not allowed",
        }).success,
      ).toBe(false);
    });
  });

  describe("patchAdminUserSchema (AC-18, AC-19, BR-29, BR-30, FR-17)", () => {
    it("accepts partial updates", () => {
      expect(
        patchAdminUserSchema.safeParse({ name: "Updated Name" }).success,
      ).toBe(true);
      expect(
        patchAdminUserSchema.safeParse({ email: "new.email@example.com" })
          .success,
      ).toBe(true);
      expect(
        patchAdminUserSchema.safeParse({ role: "ADMINISTRATOR" }).success,
      ).toBe(true);
      expect(patchAdminUserSchema.safeParse({ isActive: false }).success).toBe(
        true,
      );
    });

    it("rejects empty update payload with no fields", () => {
      const result = patchAdminUserSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects invalid fields in patch", () => {
      expect(patchAdminUserSchema.safeParse({ name: "A" }).success).toBe(false);
      expect(
        patchAdminUserSchema.safeParse({ email: "invalid-email" }).success,
      ).toBe(false);
      expect(
        patchAdminUserSchema.safeParse({ role: "INVALID_ROLE" }).success,
      ).toBe(false);
    });

    it("rejects unrecognized properties", () => {
      expect(
        patchAdminUserSchema.safeParse({
          name: "Valid Name",
          unknown: "extra",
        }).success,
      ).toBe(false);
    });
  });

  describe("resetPasswordSchema (AC-20, BR-33, FR-18)", () => {
    it("accepts valid initial password with 8 or more characters", () => {
      expect(
        resetPasswordSchema.safeParse({
          initialPassword: "TempPassword123!",
        }).success,
      ).toBe(true);
      expect(
        resetPasswordSchema.safeParse({ initialPassword: "12345678" }).success,
      ).toBe(true);
    });

    it("rejects initial password shorter than 8 characters", () => {
      expect(
        resetPasswordSchema.safeParse({ initialPassword: "1234567" }).success,
      ).toBe(false);
      expect(
        resetPasswordSchema.safeParse({ initialPassword: "" }).success,
      ).toBe(false);
    });

    it("rejects unrecognized properties", () => {
      expect(
        resetPasswordSchema.safeParse({
          initialPassword: "ValidPassword123!",
          extra: 123,
        }).success,
      ).toBe(false);
    });
  });
});
