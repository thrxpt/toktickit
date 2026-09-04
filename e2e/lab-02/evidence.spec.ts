import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  createTicket,
  REQUESTER_A,
  REQUESTER_B,
  REQUESTER_D,
  selectRequester,
  switchRequester,
  VALID_PDF_BUFFER,
} from './helpers';

const EXPECTED_SCREENSHOTS = [
  // create-ticket/ (9 paths)
  'artifacts/lab-02/screenshots/create-ticket/desktop.png',
  'artifacts/lab-02/screenshots/create-ticket/tablet.png',
  'artifacts/lab-02/screenshots/create-ticket/mobile.png',
  'artifacts/lab-02/screenshots/create-ticket/initial.png',
  'artifacts/lab-02/screenshots/create-ticket/validation-failure.png',
  'artifacts/lab-02/screenshots/create-ticket/submitting.png',
  'artifacts/lab-02/screenshots/create-ticket/success.png',
  'artifacts/lab-02/screenshots/create-ticket/api-failure.png',
  'artifacts/lab-02/screenshots/create-ticket/invalid-attachment.png',

  // my-tickets/ (9 paths)
  'artifacts/lab-02/screenshots/my-tickets/desktop.png',
  'artifacts/lab-02/screenshots/my-tickets/tablet.png',
  'artifacts/lab-02/screenshots/my-tickets/mobile.png',
  'artifacts/lab-02/screenshots/my-tickets/empty.png',
  'artifacts/lab-02/screenshots/my-tickets/no-results.png',
  'artifacts/lab-02/screenshots/my-tickets/loading.png',
  'artifacts/lab-02/screenshots/my-tickets/error.png',
  'artifacts/lab-02/screenshots/my-tickets/requester-a.png',
  'artifacts/lab-02/screenshots/my-tickets/requester-b.png',

  // ticket-detail/ (7 paths)
  'artifacts/lab-02/screenshots/ticket-detail/desktop.png',
  'artifacts/lab-02/screenshots/ticket-detail/tablet.png',
  'artifacts/lab-02/screenshots/ticket-detail/mobile.png',
  'artifacts/lab-02/screenshots/ticket-detail/attachments-active.png',
  'artifacts/lab-02/screenshots/ticket-detail/attachments-removed.png',
  'artifacts/lab-02/screenshots/ticket-detail/removal-confirm.png',
  'artifacts/lab-02/screenshots/ticket-detail/not-owned.png',
];

test.describe('Visual Evidence and State Capture', () => {
  test('E2E-04 — API failure via route interception (AC-17, AC-25)', async ({
    page,
  }) => {
    await selectRequester(page, REQUESTER_A);
    await page.goto('/tickets/new');

    // Wait for reference dropdowns
    await expect(page.locator('#categoryId')).not.toBeDisabled();
    await expect(page.locator('#relatedSystemId')).not.toBeDisabled();

    // Fill form fields
    const testSummary = 'Database Connection Timeout in Production Service';
    const testDescription =
      'The payment service cannot establish connection pool to the primary database server.';

    // Select category and system
    const catVal = await page
      .locator('#categoryId option')
      .filter({ hasText: 'Software' })
      .first()
      .getAttribute('value');
    if (catVal) await page.selectOption('#categoryId', catVal);

    const sysVal = await page
      .locator('#relatedSystemId option')
      .filter({ hasText: 'LEB2 App' })
      .first()
      .getAttribute('value');
    if (sysVal) await page.selectOption('#relatedSystemId', sysVal);

    await page.selectOption('#requestedPriority', 'HIGH');
    await page.fill('#summary', testSummary);
    await page.fill('#description', testDescription);

    // Intercept POST /api/tickets to simulate server failure (AC-17)
    await page.route('**/api/tickets', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message: 'Database server is unreachable. Please retry shortly.',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.click('button:has-text("Create Ticket")');

    // Verify safe error state is shown (BR-25, AC-17)
    await expect(
      page.locator('text=Database server is unreachable. Please retry shortly.'),
    ).toBeVisible();

    // Verify all entered values are retained (BR-25)
    await expect(page.locator('#summary')).toHaveValue(testSummary);
    await expect(page.locator('#description')).toHaveValue(testDescription);
    await expect(page.locator('#requestedPriority')).toHaveValue('HIGH');

    // Capture evidence screenshot for api-failure
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/create-ticket/api-failure.png',
      fullPage: true,
      animations: 'disabled',
    });

    // Clean up route
    await page.unroute('**/api/tickets');
  });

  test('Capture Create Ticket State Evidence', async ({ page }) => {
    await selectRequester(page, REQUESTER_A);

    // 1. Initial blank state
    await page.goto('/tickets/new');
    await expect(page.locator('h1:has-text("Create Ticket")')).toBeVisible();
    await expect(page.locator('#categoryId')).not.toBeDisabled();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/create-ticket/initial.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 2. Validation failure state
    // Submit empty form to trigger field-level validation messages
    await page.click('button:has-text("Create Ticket")');
    await expect(
      page.locator('text=Summary must be at least 5 characters.'),
    ).toBeVisible();
    await expect(
      page.locator('text=Description must be at least 10 characters.'),
    ).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/create-ticket/validation-failure.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 3. Submitting busy state
    // Fill valid fields
    const catVal = await page
      .locator('#categoryId option')
      .filter({ hasText: 'Software' })
      .first()
      .getAttribute('value');
    if (catVal) await page.selectOption('#categoryId', catVal);

    const sysVal = await page
      .locator('#relatedSystemId option')
      .filter({ hasText: 'Email' })
      .first()
      .getAttribute('value');
    if (sysVal) await page.selectOption('#relatedSystemId', sysVal);

    await page.fill('#summary', 'Valid ticket summary for submitting state test');
    await page.fill(
      '#description',
      'Valid ticket description explaining the full technical scenario.',
    );

    // Delay POST /api/tickets response to capture busy state
    await page.route('**/api/tickets', async (route) => {
      if (route.request().method() === 'POST') {
        // Wait 2.5 seconds before continuing so screenshot captures submitting spinner
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Click submit and capture busy button state
    await page.click('button:has-text("Create Ticket")');
    const submitBtn = page.locator('button[type="submit"]:has-text("Submitting…")');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/create-ticket/submitting.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 4. Success state
    await expect(page.locator('[data-testid="success-panel"]')).toBeVisible({
      timeout: 10000,
    });
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/create-ticket/success.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.unroute('**/api/tickets');

    // 5. Invalid attachment state
    await page.goto('/tickets/new');
    await page.setInputFiles('#attachment-file-input', {
      name: 'unsupported-script.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('binary-exe-contents'),
    });
    // The uploader shows per-file error alert (ui-spec.md §6)
    await expect(page.locator('.alert-danger')).toBeVisible();
    await expect(
      page.locator('text=Unsupported file type. Permitted: JPG, PNG, WEBP, PDF.'),
    ).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/create-ticket/invalid-attachment.png',
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Capture My Tickets State Evidence', async ({ page }) => {
    await selectRequester(page, REQUESTER_A);

    // 1. Loading state (interception delay)
    let releaseLoadingRoute: () => void = () => {};
    await page.route('**/api/tickets*', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise<void>((resolve) => {
          releaseLoadingRoute = resolve;
        });
        try {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [],
              meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
            }),
          });
        } catch {
          // Route already handled or aborted
        }
      } else {
        await route.continue();
      }
    });
    await page.goto('/tickets');
    await expect(page.locator('text=Loading tickets…')).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/my-tickets/loading.png',
      fullPage: true,
      animations: 'disabled',
    });
    releaseLoadingRoute();
    await page.unroute('**/api/tickets*');

    // 2. Error state (API 500 error)
    await page.route('**/api/tickets*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Server error loading tickets.',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto('/tickets');
    await expect(page.locator('text=Something went wrong')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/my-tickets/error.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.unroute('**/api/tickets*');

    // 3. No-results state (filters matching nothing)
    await page.goto('/tickets?search=NO_TICKETS_MATCH_THIS_UNIQUE_STRING_12345');
    await expect(page.locator('text=No matching tickets')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Filters")').first()).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/my-tickets/no-results.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 4. Empty state (Requester D who has no tickets)
    await switchRequester(page, REQUESTER_D);
    await page.goto('/tickets');
    await expect(page.locator('text=No tickets yet')).toBeVisible();
    await expect(
      page.locator('.card:has(h2:has-text("No tickets yet")) a:has-text("Create Ticket")'),
    ).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/my-tickets/empty.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 5. Requester A list
    await switchRequester(page, REQUESTER_A);
    await page.goto('/tickets');
    await expect(page.locator('table')).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/my-tickets/requester-a.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 6. Requester B list
    await switchRequester(page, REQUESTER_B);
    await page.goto('/tickets');
    // Ensure B's view is loaded
    await expect(page.locator('button[aria-label="Requester profile"]')).toContainText(
      REQUESTER_B,
    );
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/my-tickets/requester-b.png',
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Capture Ticket Detail State Evidence', async ({ page }) => {
    // Establish context as Requester A and create a ticket for evidence capture
    await selectRequester(page, REQUESTER_A);
    const { ticketId } = await createTicket(page, {
      summary: 'Evidence Capture Ticket - Attachments and Permissions',
      description:
        'Detailed description for capturing active, removed, and unowned evidence states.',
    });

    await page.goto(`/tickets/${ticketId}`);

    // 1. Upload an active attachment -> attachments-active.png
    const testFileName = 'system-audit-log.pdf';
    await page.setInputFiles('#attachment-file-input', {
      name: testFileName,
      mimeType: 'application/pdf',
      buffer: VALID_PDF_BUFFER,
    });
    await expect(page.locator('h3:has-text("Attachments")')).toContainText(
      'Attachments (1 of 5)',
    );
    const activeItem = page.locator(`li:has-text("${testFileName}")`);
    await expect(activeItem).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/ticket-detail/attachments-active.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 2. Open removal confirmation dialog -> removal-confirm.png
    await activeItem.locator('button:has-text("Remove")').click();
    const dialog = page.locator('.modal:has-text("Remove Attachment")');
    await expect(dialog).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/ticket-detail/removal-confirm.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 3. Confirm removal -> attachments-removed.png
    await dialog
      .locator('#removal-reason')
      .fill('Audit log replaced with updated redacted version.');
    await dialog.locator('button:has-text("Remove")').click();
    await expect(page.locator('h4:has-text("Removed Attachments")')).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/ticket-detail/attachments-removed.png',
      fullPage: true,
      animations: 'disabled',
    });

    // 4. Not-owned state -> not-owned.png
    // Switch to Requester B and access Requester A's ticket
    await switchRequester(page, REQUESTER_B);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.locator('h2:has-text("Ticket Not Found")')).toBeVisible();
    await page.screenshot({
      path: 'artifacts/lab-02/screenshots/ticket-detail/not-owned.png',
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('RESP-05 — Evidence capture (ui-spec §9)', async () => {
    // Assert every path in ui-spec.md §9 exists and is non-empty
    for (const relativePath of EXPECTED_SCREENSHOTS) {
      const fullPath = path.resolve(process.cwd(), relativePath);
      expect(
        fs.existsSync(fullPath),
        `Screenshot must exist at: ${relativePath}`,
      ).toBe(true);

      const stats = fs.statSync(fullPath);
      expect(
        stats.isFile(),
        `Screenshot path must be a regular file: ${relativePath}`,
      ).toBe(true);
      expect(
        stats.size,
        `Screenshot must be non-empty (was ${stats.size} bytes): ${relativePath}`,
      ).toBeGreaterThan(0);
    }
  });
});
