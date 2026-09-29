import { expect, test } from "@playwright/test";

import { captureScreenshot, login, logout, TEST_USERS } from "./helpers";

test.describe("IT Staff Ticket Queue and Operational Flow (AC-10 to AC-15)", () => {
  test("E2E-03 — Staff workflow: queue, claim ticket, update priority/status, add comment and note", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testSummary = `E2E-03 Staff Triage Ticket ${timestamp}`;
    const testDescription = `Automated end-to-end verification of IT Staff operational lifecycle ${timestamp}.`;

    // 1. Create a fresh unassigned ticket as Requester
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(
      page,
      TEST_USERS.requester.email,
      TEST_USERS.requester.password,
    );
    await page.waitForURL("**/tickets");

    await page.goto("/tickets/new");
    await expect(page.locator("#categoryId")).not.toBeDisabled();
    await page.selectOption("#categoryId", { index: 1 });
    await expect(page.locator("#relatedSystemId")).not.toBeDisabled();
    await page.selectOption("#relatedSystemId", { index: 1 });
    await page.fill("#summary", testSummary);
    await page.fill("#description", testDescription);
    await page.click('button[type="submit"]:has-text("Create Ticket")');

    // Wait for success screen and retrieve official ticket number
    await expect(
      page.locator('h2:has-text("Ticket Created Successfully")'),
    ).toBeVisible();
    const ticketNumberLocator = page.locator("text=/TKT-2026-\\d+/").first();
    await expect(ticketNumberLocator).toBeVisible();
    const ticketNumberText = await ticketNumberLocator.textContent();
    const match = ticketNumberText?.match(/TKT-2026-\d+/);
    expect(match).not.toBeNull();
    const ticketNumber = match ? match[0] : "";

    // Log out Requester
    await logout(page);

    // 2. Log in as IT Staff
    await login(page, TEST_USERS.staff.email, TEST_USERS.staff.password);
    await page.waitForURL("**/staff/queue");

    // Capture Desktop Queue screenshot (1280px)
    await expect(page.locator('h1:has-text("Ticket Queue")')).toBeVisible();
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/staff-queue/queue-desktop.png",
    );

    // Capture Mobile Queue Cards screenshot (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/staff-queue/queue-mobile-cards.png",
    );

    // Capture Tablet Filtered Queue screenshot (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    const filtersBtn = page.locator('button:has-text("Filters")');
    await filtersBtn.click();
    await expect(page.locator('select[aria-label="Filter by category"]')).toBeVisible();
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/staff-queue/queue-filtered-tablet.png",
    );

    // Reset to Desktop (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });

    // 3. Search for the unassigned ticket (AC-10, FR-09)
    const searchInput = page.locator('input[placeholder*="Search by ticket number"]');
    await searchInput.fill(ticketNumber);
    // Debounce wait
    await page.waitForTimeout(350);

    const ticketRow = page.locator(`tr:has-text("${ticketNumber}")`);
    await expect(ticketRow).toBeVisible();

    // 4. Open Ticket Detail (FR-10)
    await page.locator(`table a:has-text("${ticketNumber}")`).click();
    await page.waitForURL(/\/staff\/tickets\/\d+/);
    await expect(page.locator(`h1:has-text("${ticketNumber}")`)).toBeVisible();

    // Capture Ticket Detail screenshot
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/staff-ticket-detail/detail-desktop.png",
    );

    // 5. Claim Ticket (AC-11, BR-23)
    // Initially unassigned with status New
    await expect(page.locator("#staff-ticket-owner")).toHaveValue("");
    const claimBtn = page.locator('button:has-text("Claim")');
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();

    // Auto-advances NEW to OPEN and assigns to Michael Brown
    await expect(page.locator("#staff-ticket-owner")).not.toHaveValue("");
    await expect(page.locator(".zen-badge-status-open")).toBeVisible();

    // 6. Update IT Priority (AC-12, BR-20)
    await page.selectOption("#staff-ticket-priority", "CRITICAL");
    await expect(page.locator(".zen-badge-critical")).toBeVisible();

    // 7. Transition Status: OPEN -> IN_PROGRESS (AC-13, BR-22)
    await page.selectOption("#staff-ticket-status", "IN_PROGRESS");
    await expect(page.locator(".zen-badge-status-in-progress")).toBeVisible();

    // 8. Add Public Comment (AC-14, FR-07, FR-14)
    const commentsTab = page.locator('button[role="tab"]:has-text("Public Comments")');
    await commentsTab.click();

    const publicCommentText = `IT Staff investigating infrastructure logs at ${timestamp}.`;
    await page.fill("#public-comment-input", publicCommentText);
    await page.click('button:has-text("Post Comment")');

    await expect(page.locator(`text=${publicCommentText}`)).toBeVisible();
    await expect(
      page
        .locator(`.card:has-text("${publicCommentText}")`)
        .locator(`text=${TEST_USERS.staff.name}`),
    ).toBeVisible();
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/staff-ticket-detail/public-comments-tab.png",
    );

    // 9. Add Internal Note (AC-15, BR-04, FR-14)
    const notesTab = page.locator('button[role="tab"]:has-text("Internal Notes")');
    await notesTab.click();

    // Verify amber callout warning banner
    await expect(
      page.locator("text=Private IT Staff Notes — Strictly invisible to Requesters"),
    ).toBeVisible();

    const internalNoteText = `Internal radius secret verified on authentication node ${timestamp}.`;
    await page.fill("#internal-note-input", internalNoteText);
    await page.click('button:has-text("Save Internal Note")');

    await expect(page.locator(`text=${internalNoteText}`)).toBeVisible();
    await captureScreenshot(
      page,
      "artifacts/lab-03/screenshots/staff-ticket-detail/internal-notes-amber-callout.png",
    );

    // 10. Verify Requester cannot see Internal Notes (AC-08, AC-15)
    await logout(page);
    await login(
      page,
      TEST_USERS.requester.email,
      TEST_USERS.requester.password,
    );
    await page.waitForURL("**/tickets");

    await page.locator(`table a:has-text("${ticketNumber}")`).click();
    await page.waitForURL(/\/tickets\/\d+/);
    await expect(page.locator("#ticket-number")).toContainText(ticketNumber);

    // Public comment is visible to Requester
    await expect(page.locator(`text=${publicCommentText}`)).toBeVisible();

    // Internal note is strictly absent from Requester view (AC-08, AC-15)
    await expect(page.locator(`text=${internalNoteText}`)).not.toBeVisible();
    await expect(
      page.locator('button[role="tab"]:has-text("Internal Notes")'),
    ).not.toBeVisible();
  });
});
