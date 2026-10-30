import { expect, test } from "@playwright/test";
import { login, logout, TEST_USERS } from "../lab-03/helpers";

test("E2E-03 — AC-12–AC-16: role dashboards drill into filtered collections", async ({
  page,
}) => {
  await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "My Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: /^Open Tickets,/ }).click();
  await expect(page).toHaveURL(/statusGroup=open/);
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await page.goto("/dashboard");
  await page
    .getByRole("link", { name: "View all recently resolved Tickets" })
    .click();
  await expect(page).toHaveURL(
    /statusGroup=resolved&sort=updatedAt&order=desc/,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await logout(page);

  await login(page, TEST_USERS.staff.email, TEST_USERS.staff.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: /^Unassigned,/ }).click();
  await expect(page).toHaveURL(/owner=unassigned/);
  await expect(
    page.getByRole("heading", { name: "Ticket Queue" }),
  ).toBeVisible();
  await logout(page);

  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  await expect(
    page.getByRole("heading", { name: "Administration Dashboard" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /^REQUESTER,/ }).click();
  await expect(page).toHaveURL(/admin\/users\?role=REQUESTER/);
  await expect(page.getByRole("combobox", { name: /role/i })).toHaveValue(
    "REQUESTER",
  );
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /^Total,/ }).click();
  await expect(page).toHaveURL(/admin\/users$/);
  await expect(page.getByRole("combobox", { name: /role/i })).toHaveValue("");
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /^Unassigned,/ }).click();
  await expect(
    page.getByRole("heading", { name: "Ticket Queue" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Accounts", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/toktickit-dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/toktickit-dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await logout(page);
  await login(page, "marcus.chen@example.ac.th", TEST_USERS.requester.password);
  await expect(
    page.getByRole("link", { name: "Open Tickets, 0, view list" }),
  ).toBeVisible();
  await expect(
    page.getByText("No Tickets yet. Create one when something needs IT."),
  ).toHaveCount(2);
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: "Create Ticket", exact: true }),
  ).toBeVisible();
});
