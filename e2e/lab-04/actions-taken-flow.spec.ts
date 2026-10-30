import { expect, test } from "@playwright/test";
import { login, logout, TEST_USERS } from "../lab-03/helpers";

test("E2E-01, RESP-01 — AC-01, AC-02, AC-03, AC-18, AC-19: staff records and edits; Requester reads", async ({
  page,
}) => {
  await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
  await page.waitForURL("**/tickets");
  const categories = await (await page.request.get("/api/categories")).json();
  const systems = await (await page.request.get("/api/related-systems")).json();
  const created = await page.request.post("/api/tickets", {
    data: {
      categoryId: categories[0].id,
      relatedSystemId: systems[0].id,
      summary: `E2E Actions Taken ${Date.now()}`,
      description: "Battery fails to charge.",
      requestedPriority: "MEDIUM",
    },
  });
  expect(created.status()).toBe(201);
  const ticket = await created.json();
  await logout(page);
  await login(page, TEST_USERS.staff.email, TEST_USERS.staff.password);
  await page.waitForURL("**/staff/queue");
  await page.goto(`/staff/tickets/${ticket.id}`);
  await page.getByRole("tab", { name: /Actions Taken/ }).click();
  await page.getByRole("button", { name: "Record Action" }).click();
  await page
    .getByLabel("Description *", { exact: true })
    .fill("Replaced battery");
  await page.getByLabel("Result *", { exact: true }).fill("Charge restored");
  await page.getByRole("switch", { name: "Follow-Up Required" }).check();
  await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/create.png", fullPage: true });
  await page.getByRole("button", { name: "Save Action" }).click();
  await expect(page.getByText("Follow-up Note is required.")).toBeVisible();
  await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/validation.png", fullPage: true });
  await page
    .getByLabel("Follow-up Note *", { exact: true })
    .fill("Monitor charge tomorrow");
  await page
    .getByLabel("Attachment Notes", { exact: true })
    .fill("battery-old.jpg");
  await page.getByRole("button", { name: "Save Action" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Action saved." }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Actions Taken (1)" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.locator("#action-performer")).toHaveText(
    TEST_USERS.staff.name,
  );
  await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/edit.png", fullPage: true });
  await page
    .getByLabel("Result *", { exact: true })
    .fill("Charge holds after testing");
  await page.getByRole("button", { name: "Save Action" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Action saved." }),
  ).toBeVisible();
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page
        .getByText("Charge holds after testing", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/lab-04/screenshots/actions-taken/list-${width}.png`,
      fullPage: true,
    });
  }
  await logout(page);
  await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
  await page.waitForURL("**/tickets");
  await page.goto(`/tickets/${ticket.id}`);
  const panel = page.getByRole("region", {
    name: "Actions Taken",
    exact: true,
  });
  await expect(panel.getByText("Replaced battery")).toBeVisible();
  await expect(panel.getByText("Charge holds after testing")).toBeVisible();
  await expect(panel.getByRole("button")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/requester-390.png", fullPage: true });
  expect(
    (
      await page.request.post(`/api/tickets/${ticket.id}/actions`, {
        data: { description: "No", result: "No", expectedVersion: 2 },
      })
    ).status(),
  ).toBe(403);
});
