import bcrypt from "bcrypt";
import { z } from "zod";

// BR-06: Passwords must never be stored in plaintext. Passwords are salted and
// hashed using bcrypt with a minimum work factor of 10.
export const BCRYPT_SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// BR-07: New passwords must be at least 8 characters in length and contain at least
// one uppercase letter, one lowercase letter, one numeric digit, and one special character.
export function validatePasswordPolicy(
  password: string,
): PasswordValidationResult {
  const errors: string[] = [];

  if (typeof password !== "string" || password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one numeric digit.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const passwordPolicySchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one numeric digit.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character.",
  );
