import { expect, test } from "@playwright/test";

import { captureScreenshot, login, logout, TEST_USERS } from "./helpers";

test.describe("Authentication and Password Lifecycle (AC-01 to AC-05)", () => {
  test("E2E-01 — Full login, role navigation display, and logout flow (AC-01, AC-04, AC-05)", async ({
    page,
  }) => {
    // 1. Visit Login on Desktop (1280px) and capture visual screenshot
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await expect(page.locator('h1:has-text("TokTickIT")')).toBeVisible();
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/authentication/login-desktop.png",
    );

    // 2. Viewport mobile (390px) capture
    await page.setViewportSize({ width: 390, height: 844 });
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/authentication/login-mobile.png",
    );

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // 3. Invalid credentials test (AC-01, BR-09)
    await page.fill('input[type="email"]', TEST_USERS.requester.email);
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page.locator(".alert-danger")).toBeVisible();
    await expect(page.locator(".alert-danger")).toContainText("Invalid email or password");
    expect(page.url()).toContain("/login");

    // 4. Inactive account test (AC-04, BR-10)
    await page.fill('input[type="email"]', TEST_USERS.inactive.email);
    await page.fill('input[type="password"]', TEST_USERS.inactive.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page.locator(".alert-danger")).toBeVisible();
    await expect(page.locator(".alert-danger")).toContainText(
      "Account is deactivated",
    );
    expect(page.url()).toContain("/login");

    // 5. Valid login test (AC-01, BR-01)
    await page.fill('input[type="email"]', TEST_USERS.requester.email);
    await page.fill('input[type="password"]', TEST_USERS.requester.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL("**/tickets");

    // Assert AppShell identity and role presentation (FR-04, FR-20)
    await expect(page.locator(`text=${TEST_USERS.requester.name}`)).toBeVisible();
    await expect(page.locator(".zen-badge-role-requester")).toBeVisible();
    await expect(page.locator('header a:has-text("My Tickets")')).toBeVisible();
    await expect(page.locator('header a:has-text("Create Ticket")')).toBeVisible();

    // Verify Staff and Admin navigation links are not rendered (FR-20)
    await expect(page.locator('header a:has-text("Ticket Queue")')).not.toBeVisible();
    await expect(page.locator('header a:has-text("Users")')).not.toBeVisible();

    // 6. Logout test (AC-05, BR-11)
    await logout(page);
    expect(page.url()).toContain("/login");

    // Verify session invalidated - direct navigation to /tickets redirects to /login
    await page.goto("/tickets");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("E2E-02 — Mandatory first-login password change and app entry (AC-02, AC-03)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Log in with user requiring password change (AC-02, BR-02)
    await login(
      page,
      TEST_USERS.mustChange.email,
      TEST_USERS.mustChange.password,
    );
    await page.waitForURL("**/change-password");

    // Verify forced redirect and capture visual evidence
    await expect(page.locator('h1:has-text("Change Your Password")')).toBeVisible();
    await expect(
      page.locator("text=You must change your password to continue."),
    ).toBeVisible();
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/authentication/change-password-desktop.png",
    );

    // 2. Direct route bypass attempt blocked (BR-02)
    await page.goto("/tickets");
    await page.waitForURL("**/change-password");
    expect(page.url()).toContain("/change-password");

    // 3. Test password policy validation checklist (BR-07, UI-03)
    await page.fill("#currentPassword", TEST_USERS.mustChange.password);

    // Non-compliant password
    await page.fill("#newPassword", "short");
    await page.fill("#confirmPassword", "short");
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    // 4. Fill compliant new password (AC-03, BR-07, BR-12)
    const newPassword = "BrandNewPassword99!";
    await page.fill("#newPassword", newPassword);
    await page.fill("#confirmPassword", newPassword);

    // Criteria should now be fulfilled and button enabled
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // App entry unlocked
    await page.waitForURL("**/tickets");
    await expect(page.locator(`text=${TEST_USERS.mustChange.name}`)).toBeVisible();

    // 5. Verify logout and re-login with the updated credentials
    await logout(page);
    await login(page, TEST_USERS.mustChange.email, newPassword);
    await page.waitForURL("**/tickets");
    await expect(page.locator(`text=${TEST_USERS.mustChange.name}`)).toBeVisible();
  });
});
