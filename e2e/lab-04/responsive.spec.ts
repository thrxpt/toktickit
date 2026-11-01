import { expect, test, type Locator, type Page } from "@playwright/test";
import { login, logout, TEST_USERS } from "../lab-03/helpers";

async function focusedCapture(page: Page, target: Locator, name: string, width: number) {
  await page.keyboard.press("Tab");
  await target.focus();
  await expect(target).toBeFocused();
  const ring = await target.evaluate(element => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
  });
  expect(ring, `${name} keyboard focus`).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflow`).toBe(true);
  if (width === 390 && await target.evaluate(el => el.matches("button, input, textarea, select"))) {
    expect((await target.boundingBox())!.height, `${name} touch height`).toBeGreaterThanOrEqual(44);
  }
  if (width === 390) {
    for (const profile of await page.getByRole("button", { name: "User profile" }).all()) {
      const box = await profile.boundingBox();
      expect(box!.width, "profile touch width").toBeGreaterThanOrEqual(44);
      expect(box!.height, "profile touch height").toBeGreaterThanOrEqual(44);
    }
  }
  await page.screenshot({ path: `artifacts/lab-04/screenshots/release/${name}-${width}.png`, fullPage: name !== "user-editor" });
}

for (const width of [1280, 768, 390]) {
  test(`RESP-01–RESP-04, AC-24–AC-26 — release screens and keyboard focus at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      // Anonymous session probes and the deliberate stale write have expected HTTP diagnostics.
      const expectedProbe = message.location().url.endsWith("/api/auth/me") && /status of 401/.test(message.text());
      const expectedConflict = /\/api\/tickets\/\d+\/actions$/.test(message.location().url) && /status of 409/.test(message.text());
      if (message.type() === "error" && !expectedProbe && !expectedConflict) errors.push(`${message.location().url}: ${message.text()}`);
    });
    // Prepare an empty account independently of every preceding regression journey.
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.waitForURL("**/dashboard");
    const email = `e2e.release.${width}.${Date.now()}@toktickit.com`;
    const account = await page.request.post("/api/admin/users", { data: {
      name: "E2E Empty Requester", email, role: "REQUESTER", initialPassword: "Password123!",
    } });
    expect(account.status()).toBe(201);
    await logout(page);
    await focusedCapture(page, page.getByLabel("Email", { exact: false }), "login", width);

    await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("link", { name: /^Open Tickets,/ })).toBeVisible();
    await focusedCapture(page, page.getByRole("link", { name: /^Open Tickets,/ }), "requester-dashboard", width);
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await focusedCapture(page, page.locator(".zen-brand"), "my-tickets", width);
    await page.goto("/tickets/new");
    await expect(page.locator("#categoryId")).toBeEnabled();
    await focusedCapture(page, page.locator("#summary"), "create-ticket", width);
    await logout(page);

    await login(page, TEST_USERS.staff.email, TEST_USERS.staff.password);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("link", { name: /^Unassigned,/ })).toBeVisible();
    await focusedCapture(page, page.getByRole("link", { name: /^Unassigned,/ }), "staff-dashboard", width);
    await expect(page.getByRole("heading", { name: "By Status" })).toBeVisible();
    await page.goto("/staff/queue");
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await focusedCapture(page, page.locator(".zen-brand"), "ticket-queue", width);
    const rows = await (await page.request.get("/api/staff/tickets?search=TKT-2026-900003")).json();
    const id = rows.items[0].id;
    await page.goto(`/staff/tickets/${id}`);
    await expect(page.getByRole("combobox", { name: "Current Status" })).toBeVisible();
    const detail = await (await page.request.get(`/api/staff/tickets/${id}`)).json();
    const offered = await page.locator("#staff-ticket-status option:not(:disabled)").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
    expect(offered).toEqual(detail.permittedTransitions);
    await focusedCapture(page, page.getByRole("combobox", { name: "Current Status" }), "staff-detail", width);
    await page.getByRole("tab", { name: /Actions Taken/ }).click();
    await expect(page.getByText("Checked laptop battery").filter({ visible: true }).first()).toBeVisible();
    await focusedCapture(page, page.getByRole("button", { name: "Record Action" }), "actions-list", width);
    await page.getByRole("button", { name: "Edit", exact: true }).first().click();
    await expect(page.getByRole("form", { name: "Edit Action Taken" }).getByText("Performed by", { exact: true })).toBeVisible();
    await focusedCapture(page, page.getByLabel("Description *", { exact: true }), "actions-edit", width);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Record Action" }).click();
    await page.getByLabel("Description *", { exact: true }).fill("Retained release work log draft");
    await page.getByLabel("Result *", { exact: true }).fill("Battery diagnostics complete");
    await page.getByRole("switch", { name: "Follow-Up Required" }).check();
    await focusedCapture(page, page.getByLabel("Description *", { exact: true }), "actions-create", width);
    await page.getByRole("button", { name: "Save Action" }).click();
    await expect(page.getByText("Supply a follow-up note exactly when follow-up is required.")).toBeVisible();
    await focusedCapture(page, page.getByLabel("Follow-up Note *", { exact: true }), "actions-validation", width);
    await page.getByLabel("Follow-up Note *", { exact: true }).fill("Recheck battery tomorrow");
    const update = await page.request.patch(`/api/staff/tickets/${id}/priority`, { data: { itPriority: "HIGH", expectedVersion: detail.version } });
    expect(update.status()).toBe(200);
    await page.getByRole("button", { name: "Save Action" }).click();
    await expect(page.getByRole("button", { name: "Reload ticket" })).toBeVisible();
    await expect(page.getByLabel("Description *", { exact: true })).toHaveValue("Retained release work log draft");
    await focusedCapture(page, page.getByRole("button", { name: "Reload ticket" }), "conflict", width);
    await page.getByRole("button", { name: "Reload ticket" }).click();
    await expect(page.getByLabel("Description *", { exact: true })).toHaveValue("Retained release work log draft");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    const cancelled = await (await page.request.get("/api/staff/tickets?search=TKT-2026-900008")).json();
    await page.goto(`/staff/tickets/${cancelled.items[0].id}`);
    await expect(page.getByText("This Ticket is cancelled; no further status changes are possible.")).toBeVisible();
    await focusedCapture(page, page.locator(".zen-brand"), "cancelled-detail", width);
    await logout(page);

    await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
    await page.waitForURL("**/dashboard");
    await page.goto(`/tickets/${id}`);
    await expect(page.getByRole("heading", { name: "What IT has done" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record Action" })).toHaveCount(0);
    await focusedCapture(page, page.getByRole("textbox", { name: "Add Public Comment" }), "requester-detail", width);
    await logout(page);

    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Accounts", exact: true })).toBeVisible();
    await focusedCapture(page, page.getByRole("link", { name: /^Total,/ }), "admin-dashboard", width);
    await page.goto("/admin/users");
    await expect(page.getByRole("button", { name: /Create User/ })).toBeVisible();
    await focusedCapture(page, page.getByRole("button", { name: /Create User/ }), "user-management", width);
    await page.getByRole("button", { name: /Create User/ }).click();
    await focusedCapture(page, page.getByLabel(/Full Name/), "user-editor", width);
    await page.getByTestId("btn-cancel-drawer").click();
    await logout(page);
    await login(page, email, "Password123!");
    await page.waitForURL("**/change-password");
    await focusedCapture(page, page.locator("#newPassword"), "change-password", width);
    expect((await page.request.post("/api/auth/change-password", { data: {
      currentPassword: "Password123!", newPassword: "UpdatedPassword123!", confirmPassword: "UpdatedPassword123!",
    } })).status()).toBe(200);
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Open Tickets, 0, view list" })).toBeVisible();
    await focusedCapture(page, page.getByRole("link", { name: "Open Tickets, 0, view list" }), "requester-empty", width);
    expect(errors).toEqual([]);
  });
}
