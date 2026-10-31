import { expect, test } from "@playwright/test";

import { login, logout, TEST_USERS } from "../lab-03/helpers";

test("E2E-02 — AC-08–AC-11, AC-23: creation, advisory resolution, conflict, closure, reopening and cancellation", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
  await page.waitForURL("**/tickets");
  await page.goto("/tickets/new");
  await page.locator("#categoryId").selectOption({ index: 1 });
  await page.locator("#relatedSystemId").selectOption({ index: 1 });
  await page.getByLabel("Summary", { exact: false }).fill(`E2E lifecycle ${Date.now()}`);
  await page.getByLabel("Description", { exact: false }).fill("Laptop battery fails to charge after restarting.");
  const creation = page.waitForResponse(response => response.url().endsWith("/api/tickets") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create Ticket", exact: true }).click();
  const created = await creation;
  expect(created.status()).toBe(201);
  const ticket = await created.json();
  expect(ticket).toMatchObject({ status: "NEW", version: 0 });
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByRole("button", { name: "Problem Appears Resolved", exact: true })).toBeEnabled();
  expect((await page.request.patch(`/api/staff/tickets/${ticket.id}/status`, {
    data: { status: "RESOLVED", expectedVersion: 0 },
  })).status()).toBe(403);

  const adminContext = await browser.newContext({ baseURL: "http://localhost:5173", viewport: { width: 1280, height: 900 } });
  const admin = await adminContext.newPage();
  try {
    await login(admin, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await admin.waitForURL("**/admin/users");
    await admin.getByRole("link", { name: "Ticket Queue", exact: true }).click();
    await expect(admin.getByRole("heading", { name: "Ticket Queue", exact: true })).toBeVisible();
    await admin.goto(`/staff/tickets/${ticket.id}`);
    await admin.getByRole("button", { name: "Claim", exact: true }).click();
    const status = admin.getByRole("combobox", { name: "Current Status" });
    await expect(status).toHaveValue("OPEN");
    const currentOwner = admin.getByRole("combobox", { name: "Ticket Owner" });
    await expect(currentOwner.locator("option:checked")).toHaveText(TEST_USERS.admin.name);
    const transition = async (next: string) => {
      await status.selectOption(next);
      await expect(status).toHaveValue(next);
      await expect(status).toBeEnabled();
    };
    await transition("IN_PROGRESS");
    await transition("WAITING_FOR_REQUESTER");
    await admin.getByRole("tab", { name: /Public Comments/ }).click();
    await admin.getByRole("textbox").fill("Keep this unsent diagnostic detail.");
    await expect(admin.getByText("No public comments yet.", { exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Problem Appears Resolved", exact: true }).click();
    await page.getByRole("button", { name: "Yes, Problem Resolved", exact: true }).click();
    await expect(page.getByText(/You indicated this problem appears resolved/)).toBeVisible();
    const advisory = await (await page.request.get(`/api/tickets/${ticket.id}`)).json();
    expect(advisory).toMatchObject({ status: "WAITING_FOR_REQUESTER", resolvedByRequester: true, version: 4 });
    await status.selectOption("RESOLVED");
    await expect(admin.getByRole("alert").filter({ hasText: "Someone else updated this Ticket" })).toBeVisible();
    await expect(status).toHaveValue("WAITING_FOR_REQUESTER");
    await expect(admin.getByRole("button", { name: "Retry change" })).toBeDisabled();
    await admin.screenshot({ path: "artifacts/lab-04/screenshots/workflow/conflict-1280.png", fullPage: true });
    await admin.getByRole("button", { name: "Reload ticket" }).click();
    await expect(admin.getByRole("button", { name: "Retry change" })).toBeEnabled();
    await expect(admin.getByRole("textbox")).toHaveValue("Keep this unsent diagnostic detail.");
    await expect(admin.getByText(/Requester has indicated this problem appears resolved/)).toBeVisible();
    await admin.getByRole("button", { name: "Retry change" }).click();
    await expect(status).toHaveValue("RESOLVED");
    await expect(status.locator("option")).toHaveText(["Resolved (Current)", "Closed", "Reopened"]);
    await expect(admin.getByText("No public comments yet.", { exact: true })).toBeVisible();
    await admin.setViewportSize({ width: 768, height: 900 });
    await admin.screenshot({ path: "artifacts/lab-04/screenshots/workflow/resolved-768.png", fullPage: true });
    await transition("CLOSED");
    await expect(status.locator("option")).toHaveText(["Closed (Current)", "Reopened"]);
    await page.reload();
    await expect(page.locator(".zen-badge-status-closed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Problem Appears Resolved", exact: true })).toBeDisabled();

    await transition("REOPENED");
    await transition("IN_PROGRESS");
    await transition("RESOLVED");
    await transition("REOPENED");
    await status.selectOption("CANCELLED");
    await expect(admin.getByText("This Ticket is cancelled; no further status changes are possible.")).toBeVisible();
    await expect(status).toHaveCount(0);
    await admin.setViewportSize({ width: 390, height: 900 });
    expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await admin.screenshot({ path: "artifacts/lab-04/screenshots/workflow/cancelled-390.png", fullPage: true });
    const cancelled = await (await admin.request.get(`/api/staff/tickets/${ticket.id}`)).json();
    expect(cancelled).toMatchObject({ status: "CANCELLED", version: 11, permittedTransitions: [] });
    for (const next of ["CANCELLED", "RESOLVED"]) {
      const invalid = await admin.request.patch(`/api/staff/tickets/${ticket.id}/status`, {
        data: { status: next, expectedVersion: 11 },
      });
      expect(invalid.status()).toBe(400);
      expect((await invalid.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
    }

    const newTicket = await page.request.post("/api/tickets", { data: {
      summary: "E2E cancel before assignment", description: "No longer need this support request.",
      categoryId: ticket.category.id, relatedSystemId: ticket.relatedSystem.id, requestedPriority: "LOW",
    } });
    expect(newTicket.status()).toBe(201);
    const fresh = await newTicket.json();
    await admin.goto(`/staff/tickets/${fresh.id}`);
    await admin.getByRole("combobox", { name: "Current Status" }).selectOption("CANCELLED");
    await expect(admin.getByText("This Ticket is cancelled; no further status changes are possible.")).toBeVisible();
    await page.goto(`/tickets/${fresh.id}`);
    await expect(page.locator(".zen-badge-status-cancelled")).toBeVisible();
    await expect(page.getByRole("button", { name: "Problem Appears Resolved", exact: true })).toBeDisabled();
  } finally {
    await adminContext.close();
  }
});

test("E2E-02 — AC-23, ADR-0010: Staff assigns an owned Ticket to Administrator; Administrator takes over from Staff", async ({ page }) => {
  await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
  await page.waitForURL("**/tickets");
  const categories = await (await page.request.get("/api/categories")).json();
  const systems = await (await page.request.get("/api/related-systems")).json();
  const created = await page.request.post("/api/tickets", { data: {
    summary: `E2E Administrator reassignment ${Date.now()}`,
    description: "An already-owned Ticket must remain assignable to either operational role.",
    categoryId: categories[0].id, relatedSystemId: systems[0].id, requestedPriority: "MEDIUM",
  } });
  expect(created.status()).toBe(201);
  const ticket = await created.json();
  await logout(page);
  await login(page, TEST_USERS.staff.email, TEST_USERS.staff.password);
  await page.waitForURL("**/staff/queue");
  await page.goto(`/staff/tickets/${ticket.id}`);
  await page.getByRole("button", { name: "Claim", exact: true }).click();
  const owner = page.getByRole("combobox", { name: "Ticket Owner" });
  await expect(owner.locator("option:checked")).toHaveText(TEST_USERS.staff.name);
  await expect(owner).toBeEnabled();
  await owner.selectOption({ label: TEST_USERS.admin.name });
  await expect(owner.locator("option:checked")).toHaveText(TEST_USERS.admin.name);
  await expect(owner).toBeEnabled();
  await page.reload();
  await expect(owner.locator("option:checked")).toHaveText(TEST_USERS.admin.name);
  await owner.selectOption({ label: TEST_USERS.staff.name });
  await expect(owner.locator("option:checked")).toHaveText(TEST_USERS.staff.name);
  await expect(owner).toBeEnabled();
  await logout(page);
  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  await page.waitForURL("**/admin/users");
  await page.goto(`/staff/tickets/${ticket.id}`);
  await expect(owner.locator("option:checked")).toHaveText(TEST_USERS.staff.name);
  await expect(page.getByRole("button", { name: "Claim", exact: true })).toHaveCount(0);
  await owner.selectOption({ label: TEST_USERS.admin.name });
  await expect(owner.locator("option:checked")).toHaveText(TEST_USERS.admin.name);
  await expect(owner).toBeEnabled();
  await page.reload();
  await expect(owner.locator("option:checked")).toHaveText(TEST_USERS.admin.name);
  const stored = await (await page.request.get(`/api/staff/tickets/${ticket.id}`)).json();
  expect(stored).toMatchObject({ status: "OPEN", version: 4, ticketOwner: { name: TEST_USERS.admin.name } });
});
