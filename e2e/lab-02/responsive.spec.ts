import { expect, type Page, test } from "@playwright/test";

import { createTicket, REQUESTER_A, selectRequester } from "./helpers";

async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe("Responsive Layout and Viewports", () => {
  let sampleTicketId: number;

  test.beforeAll(async ({ browser }) => {
    // Ensure at least one ticket exists for detail and list views
    const page = await browser.newPage();
    await selectRequester(page, REQUESTER_A);
    const { ticketId } = await createTicket(page, {
      summary: "Responsive Layout Test Ticket",
      description: "Used across RESP-01, RESP-02, and RESP-03 viewport tests.",
    });
    sampleTicketId = ticketId;
    await page.close();
  });

  test("RESP-01 — Three screens at 1440 px (AC-42)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectRequester(page, REQUESTER_A);

    // 1. Create Ticket at 1440 px
    await page.goto("/tickets/new");
    await expect(page.locator('h1:has-text("Create Ticket")')).toBeVisible();
    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/create-ticket/desktop.png",
      fullPage: true,
      animations: "disabled",
    });

    // 2. My Tickets at 1440 px
    await page.goto("/tickets");
    await expect(page.locator('h1:has-text("My Tickets")')).toBeVisible();
    await assertNoHorizontalScroll(page);

    // Assert full table is visible with Last Updated column (desktop table)
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator('th:has-text("Last Updated")')).toBeVisible();
    await expect(page.locator('th:has-text("Ticket No.")')).toBeVisible();
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/my-tickets/desktop.png",
      fullPage: true,
      animations: "disabled",
    });

    // 3. Ticket Detail at 1440 px
    await page.goto(`/tickets/${sampleTicketId}`);
    await expect(page.locator('h1:has-text("Ticket Details")')).toBeVisible();
    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/ticket-detail/desktop.png",
      fullPage: true,
      animations: "disabled",
    });
  });

  test("RESP-02 — Three screens at 800 px (AC-42)", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1024 });
    await selectRequester(page, REQUESTER_A);

    // 1. Create Ticket at 800 px
    await page.goto("/tickets/new");
    await expect(page.locator('h1:has-text("Create Ticket")')).toBeVisible();
    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/create-ticket/tablet.png",
      fullPage: true,
      animations: "disabled",
    });

    // 2. My Tickets at 800 px
    await page.goto("/tickets");
    await expect(page.locator('h1:has-text("My Tickets")')).toBeVisible();
    await assertNoHorizontalScroll(page);

    // Table retained, but Last Updated is dropped at <992px
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator('th:has-text("Last Updated")')).not.toBeVisible();
    await expect(page.locator('th:has-text("Ticket No.")')).toBeVisible();
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/my-tickets/tablet.png",
      fullPage: true,
      animations: "disabled",
    });

    // 3. Ticket Detail at 800 px
    await page.goto(`/tickets/${sampleTicketId}`);
    await expect(page.locator('h1:has-text("Ticket Details")')).toBeVisible();
    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/ticket-detail/tablet.png",
      fullPage: true,
      animations: "disabled",
    });
  });

  test("RESP-03 — Three screens at 390 px (AC-42, AC-43)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await selectRequester(page, REQUESTER_A);

    // 1. Create Ticket at 390 px
    await page.goto("/tickets/new");
    await expect(page.locator('h1:has-text("Create Ticket")')).toBeVisible();
    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/create-ticket/mobile.png",
      fullPage: true,
      animations: "disabled",
    });

    // 2. My Tickets at 390 px
    await page.goto("/tickets");
    await expect(page.locator('h1:has-text("My Tickets")')).toBeVisible();
    await assertNoHorizontalScroll(page);

    // AC-43: My Tickets renders cards and NO table
    await expect(page.locator("table")).not.toBeVisible();
    await expect(
      page.locator('[data-testid="ticket-card"]').first(),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/my-tickets/mobile.png",
      fullPage: true,
      animations: "disabled",
    });

    // 3. Ticket Detail at 390 px
    await page.goto(`/tickets/${sampleTicketId}`);
    await expect(page.locator('h1:has-text("Ticket Details")')).toBeVisible();
    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: "artifacts/lab-02/screenshots/ticket-detail/mobile.png",
      fullPage: true,
      animations: "disabled",
    });
  });

  test("RESP-04 — Mobile navigation and filters (ui-spec §7)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await selectRequester(page, REQUESTER_A);

    await page.goto("/tickets");

    // 1. Test Navbar Toggler (<768 px)
    const toggler = page.locator('button[aria-label="Toggle navigation"]');
    await expect(toggler).toBeVisible();

    // Verify touch target >= 44x44 px (ui-spec.md §3)
    const togglerBox = await toggler.boundingBox();
    expect(togglerBox).not.toBeNull();
    expect(togglerBox!.width).toBeGreaterThanOrEqual(44);
    expect(togglerBox!.height).toBeGreaterThanOrEqual(44);

    // Open mobile nav
    await toggler.click();
    const mobileNavCreateLink = page.locator(
      'header .d-md-none a.zen-nav-link:has-text("Create Ticket")',
    );
    await expect(mobileNavCreateLink).toBeVisible();

    // 2. Test Mobile Filters Disclosure
    const filtersSummary = page.locator('details summary:has-text("Filters")');
    await expect(filtersSummary).toBeVisible();

    const summaryBox = await filtersSummary.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(summaryBox!.height).toBeGreaterThanOrEqual(44);

    // Click disclosure to open
    await filtersSummary.click();
    const mobileSearch = page.locator('details input[type="search"]');
    await expect(mobileSearch).toBeVisible();
    await expect(
      page.locator('details select[aria-label="Filter by category"]'),
    ).toBeVisible();
  });
});
