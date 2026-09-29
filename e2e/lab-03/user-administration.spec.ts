import { expect, test } from "@playwright/test";

import { captureScreenshot, login, logout, TEST_USERS } from "./helpers";

test.describe("Administrator User Management and Safety Rules (AC-16 to AC-20)", () => {
  test("E2E-04 — Admin workflow: create user, search, edit, reset password, prevent self-deactivation", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const newUserName = `Taylor Reed ${timestamp}`;
    const newUserEmail = `taylor.reed.${timestamp}@toktickit.com`;
    const initialPassword = "Password123!";
    const resetPassword = "TemporaryPass99!";

    // 1. Log in as Administrator
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.waitForURL("**/admin/users");

    // Capture User List screenshot
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/user-management/user-list-desktop.png",
    );

    // 2. Search and filter users (AC-16, FR-15)
    const searchInput = page.locator('input[placeholder*="Search users"]');
    await searchInput.fill("Michael Brown");
    await page.waitForTimeout(300); // debounce 250ms

    await expect(page.locator('tr:has-text("Michael Brown")')).toBeVisible();
    await expect(
      page.locator('tr:has-text("Jennifer Anderson")'),
    ).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(300);
    await expect(
      page.locator('tr:has-text("Jennifer Anderson")'),
    ).toBeVisible();

    // 3. Create a new user (AC-16, FR-16)
    await page.click('button:has-text("Create User")');
    await expect(page.locator("#userName")).toBeVisible();

    // Capture Create User Drawer screenshot
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/user-management/create-user-drawer.png",
    );

    await page.fill("#userName", newUserName);
    await page.fill("#userEmail", newUserEmail);
    await page.selectOption("#userRole", "IT_STAFF");
    await page.fill("#userInitialPassword", initialPassword);
    await page.click('button[data-testid="btn-save-user"]');

    // Drawer closes and new user appears in list
    await expect(page.locator("#userName")).not.toBeVisible();
    const createdRow = page.locator(`tr:has-text("${newUserEmail}")`);
    await expect(createdRow).toBeVisible();
    await expect(createdRow.locator(".zen-badge-role-staff")).toBeVisible();
    await expect(createdRow.locator(".zen-badge-user-active")).toBeVisible();

    // 4. Duplicate email conflict rejection (AC-17, BR-31)
    await page.click('button:has-text("Create User")');
    await expect(page.locator("#userName")).toBeVisible();

    await page.fill("#userName", "Duplicate Candidate");
    await page.fill("#userEmail", newUserEmail);
    await page.fill("#userInitialPassword", initialPassword);
    await page.click('button[data-testid="btn-save-user"]');

    // Field-level duplicate email error displayed (AC-17, BR-31)
    await expect(page.locator("text=already exists")).toBeVisible();

    await page.click('button[data-testid="btn-cancel-drawer"]');
    await expect(page.locator("#userName")).not.toBeVisible();

    // 5. Safety rule: Self-deactivation and last admin lock (AC-18, AC-19, BR-29, BR-30)
    const adminRow = page.locator('tr:has-text("admin@toktickit.com")');
    await adminRow.locator('button:has-text("Edit")').click();
    await expect(page.locator("#userName")).toBeVisible();

    // Capture Edit User Safety Lock screenshot
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/user-management/edit-user-safety-lock.png",
    );

    // Active toggle switch is disabled
    const activeSwitch = page.locator("#userActive");
    await expect(activeSwitch).toBeDisabled();

    // Deactivate action button is disabled
    const deactivateBtn = page.locator(
      'button[data-testid="btn-toggle-deactivate"]',
    );
    await expect(deactivateBtn).toBeDisabled();

    // Safety tooltip / explanatory text is present
    await expect(
      page.locator('[data-testid="deactivate-tooltip-text"]'),
    ).toBeVisible();

    await page.click('button[data-testid="btn-cancel-drawer"]');
    await expect(page.locator("#userName")).not.toBeVisible();

    // 6. Reset initial password (AC-20, BR-33, FR-19)
    await page
      .locator(`tr:has-text("${newUserEmail}")`)
      .locator('button:has-text("Edit")')
      .click();
    await expect(page.locator("#userName")).toBeVisible();

    // Open Reset Password modal
    await page.click('button[data-testid="btn-open-reset-password"]');
    await expect(page.locator("#newInitialPassword")).toBeVisible();

    await page.fill("#newInitialPassword", resetPassword);
    await page.click('button[data-testid="btn-submit-reset-password"]');

    // Success feedback rendered
    await expect(
      page.locator('[data-testid="drawer-reset-success"]'),
    ).toBeVisible();

    await page.click('button[data-testid="btn-cancel-drawer"]');
    await expect(page.locator("#userName")).not.toBeVisible();

    // 7. Verify the user is forced to change password on next login (AC-02, AC-20)
    await logout(page);
    await login(page, newUserEmail, resetPassword);
    await page.waitForURL("**/change-password");
    await expect(page.locator('h1:has-text("Change Your Password")')).toBeVisible();
  });
});
