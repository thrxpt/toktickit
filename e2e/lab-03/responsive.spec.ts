import { expect, type Page, test } from "@playwright/test";

async function loginAsStaff(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', "michael.brown@toktickit.com");
  await page.fill('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForURL("**/staff/queue");
}

async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe("Responsive Layout and Viewports — IT Staff Ticket Queue (ui-spec §5)", () => {
  test("RESP-01 — Desktop viewport (1280px) renders full multi-column table without clipping", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    await page.goto("/staff/queue");
    await expect(page.locator('h1:has-text("Ticket Queue")')).toBeVisible();
    await assertNoHorizontalScroll(page);

    // Desktop table with full columns should be visible
    const table = page.locator('table[aria-label="IT Staff Ticket Queue"]');
    await expect(table).toBeVisible();
    await expect(table.locator('th:has-text("Ticket No.")')).toBeVisible();
    await expect(table.locator('th:has-text("Created Date")')).toBeVisible();
    await expect(table.locator('th:has-text("Summary")')).toBeVisible();
    await expect(table.locator('th:has-text("Category")')).toBeVisible();
    await expect(table.locator('th:has-text("Req. Priority")')).toBeVisible();
    await expect(table.locator('th:has-text("IT Priority")')).toBeVisible();
    await expect(table.locator('th:has-text("Status")')).toBeVisible();
    await expect(table.locator('th:has-text("Owner")')).toBeVisible();
  });

  test("RESP-02 — Tablet viewport (768px) adapts cleanly without horizontal scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsStaff(page);

    await page.goto("/staff/queue");
    await expect(page.locator('h1:has-text("Ticket Queue")')).toBeVisible();
    await assertNoHorizontalScroll(page);
  });

  test("RESP-03 — Mobile viewport (390px) renders queue as cards with touch targets >= 44px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsStaff(page);

    await page.goto("/staff/queue");
    await expect(page.locator('h1:has-text("Ticket Queue")')).toBeVisible();
    await assertNoHorizontalScroll(page);

    // Desktop table should be hidden on mobile
    const desktopTable = page.locator('table[aria-label="IT Staff Ticket Queue"]');
    await expect(desktopTable).not.toBeVisible();

    // Verify touch target min-height on mobile buttons
    const filterBtn = page.locator('button:has-text("Filters")');
    await expect(filterBtn).toBeVisible();
    const box = await filterBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
