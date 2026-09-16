import { describe, expect, it } from "vitest";

import {
  hashPassword,
  passwordPolicySchema,
  validatePasswordPolicy,
  verifyPassword,
} from "../../src/auth/password";

describe("UNIT-01 — Password complexity: compliant password (BR-07)", () => {
  it("validates compliant passwords successfully via validatePasswordPolicy", () => {
    const compliantPasswords = [
      "Password123!",
      "SecurePass99#",
      "Aa1!aaaa",
      "SuperSecretP@ssw0rd2026",
      "C0mplex!ty",
    ];

    for (const pwd of compliantPasswords) {
      const result = validatePasswordPolicy(pwd);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("validates compliant passwords successfully via passwordPolicySchema", () => {
    const compliant = "ValidP@ssw0rd";
    const result = passwordPolicySchema.safeParse(compliant);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(compliant);
    }
  });

  it("hashes password with bcrypt and verifies correctly (BR-06)", async () => {
    const raw = "P@ssw0rd2026!";
    const hashed = await hashPassword(raw);

    expect(hashed).not.toBe(raw);
    expect(hashed).toMatch(/^\$2[aby]\$\d{2}\$/);

    const isMatch = await verifyPassword(raw, hashed);
    expect(isMatch).toBe(true);

    const isNonMatch = await verifyPassword("WrongPassword123!", hashed);
    expect(isNonMatch).toBe(false);
  });
});

describe("UNIT-02 — Password complexity: missing criteria (BR-07)", () => {
  it("fails when password is shorter than 8 characters", () => {
    const result = validatePasswordPolicy("Ab1!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long.",
    );

    const schemaResult = passwordPolicySchema.safeParse("Ab1!");
    expect(schemaResult.success).toBe(false);
  });

  it("fails when password lacks an uppercase letter", () => {
    const result = validatePasswordPolicy("password123!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter.",
    );

    const schemaResult = passwordPolicySchema.safeParse("password123!");
    expect(schemaResult.success).toBe(false);
  });

  it("fails when password lacks a lowercase letter", () => {
    const result = validatePasswordPolicy("PASSWORD123!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one lowercase letter.",
    );

    const schemaResult = passwordPolicySchema.safeParse("PASSWORD123!");
    expect(schemaResult.success).toBe(false);
  });

  it("fails when password lacks a numeric digit", () => {
    const result = validatePasswordPolicy("Password!!!!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one numeric digit.",
    );

    const schemaResult = passwordPolicySchema.safeParse("Password!!!!");
    expect(schemaResult.success).toBe(false);
  });

  it("fails when password lacks a special character", () => {
    const result = validatePasswordPolicy("Password123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one special character.",
    );

    const schemaResult = passwordPolicySchema.safeParse("Password123");
    expect(schemaResult.success).toBe(false);
  });

  it("accumulates multiple missing criteria", () => {
    const result = validatePasswordPolicy("abc");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long.",
    );
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter.",
    );
    expect(result.errors).toContain(
      "Password must contain at least one numeric digit.",
    );
    expect(result.errors).toContain(
      "Password must contain at least one special character.",
    );
  });
});
