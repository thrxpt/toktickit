import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const TEST_USERS = {
  requester: {
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.ac.th",
    password: "Password123!",
    role: "REQUESTER",
  },
  mustChange: {
    name: "Somchai Prasert",
    email: "somchai.prasert@example.ac.th",
    password: "Password123!",
    role: "REQUESTER",
  },
  inactive: {
    name: "Daniel Okafor",
    email: "daniel.okafor@example.ac.th",
    password: "Password123!",
    role: "REQUESTER",
  },
  staff: {
    name: "Michael Brown",
    email: "michael.brown@toktickit.com",
    password: "Password123!",
    role: "IT_STAFF",
  },
  admin: {
    name: "Administrator",
    email: "admin@toktickit.com",
    password: "Password123!",
    role: "ADMINISTRATOR",
  },
} as const;

/**
 * Capture high-resolution screenshot with ensured directory creation.
 */
export async function captureScreenshot(
  page: Page,
  relPath: string,
): Promise<void> {
  const fullPath = path.resolve(process.cwd(), relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await page.screenshot({ path: fullPath, fullPage: false });
}

/**
 * Log in with credentials and wait for either home route or change-password.
 */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

/**
 * Log out from the authenticated app shell.
 */
export async function logout(page: Page): Promise<void> {
  const profileBtn = page.locator('button[aria-label="User profile"]');
  await expect(profileBtn).toBeVisible();
  await profileBtn.click();
  const logoutBtn = page.locator('button:has-text("Logout")');
  await expect(logoutBtn).toBeVisible();
  await logoutBtn.click();
  await page.waitForURL("**/login");
}
