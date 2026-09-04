import { expect, test } from '@playwright/test';

import {
  createTicket,
  REQUESTER_A,
  REQUESTER_B,
  selectRequester,
  switchRequester,
  VALID_PDF_BUFFER,
} from './helpers';

test.describe('Requester Ticket Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Start each test with clean cookies/storage so requester context is explicit
    await context.clearCookies();
  });

  test('E2E-01 — Select Requester → create Ticket → find it in My Tickets (AC-08, AC-19)', async ({
    page,
  }) => {
    // 1. Navigate to /tickets without context -> redirected to /select-requester (FR-04, AC-02)
    await page.goto('/tickets');
    await expect(page).toHaveURL(/.*\/select-requester/);

    // 2. Select Requester A
    await selectRequester(page, REQUESTER_A);
    await expect(page).toHaveURL(/.*\/tickets/);

    // Verify shell displays Requester A
    await expect(page.locator('button[aria-label="Requester profile"]')).toContainText(
      REQUESTER_A,
    );

    // 3. Create Ticket (AC-08)
    const uniqueSummary = `E2E-01 Email Login Problem ${Date.now()}`;
    const { ticketNumber, ticketId } = await createTicket(page, {
      summary: uniqueSummary,
      description:
        'User cannot log in to webmail on the corporate network. Browser reports connection refused.',
      category: 'Software',
      relatedSystem: 'Email',
      priority: 'MEDIUM',
    });

    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(ticketId).toBeGreaterThan(0);

    // 4. Click "View Ticket" from success panel to open Detail
    await page.click('a:has-text("View Ticket")');
    await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}`));
    await expect(page.locator('#ticket-number')).toHaveText(ticketNumber);
    await expect(page.locator('#ticket-summary')).toHaveText(uniqueSummary);

    // 5. Navigate to My Tickets (AC-19)
    await page.click('a.zen-nav-link:has-text("My Tickets")');
    await expect(page).toHaveURL(/.*\/tickets$/);

    // Assert that the newly created ticket appears in the table
    const ticketLink = page.locator('table').locator(`a:has-text("${ticketNumber}")`);
    await expect(ticketLink).toBeVisible();
    await expect(page.locator('table').locator(`text=${uniqueSummary}`)).toBeVisible();
  });

  test("E2E-02 — Switch from Requester A to Requester B (AC-04, AC-20)", async ({
    page,
  }) => {
    // 1. Establish context as Requester A and create an owned Ticket
    await selectRequester(page, REQUESTER_A);
    const summaryA = `Requester A Private Issue ${Date.now()}`;
    const { ticketNumber: ticketNumberA } = await createTicket(page, {
      summary: summaryA,
      description: 'Private information regarding workstation setup for Requester A.',
    });

    // Verify it is visible for Requester A
    await page.goto('/tickets');
    await expect(page.locator('table').locator(`a:has-text("${ticketNumberA}")`)).toBeVisible();

    // 2. Switch from Requester A to Requester B (BR-09, AC-04)
    await switchRequester(page, REQUESTER_B);
    await expect(page.locator('button[aria-label="Requester profile"]')).toContainText(
      REQUESTER_B,
    );

    // 3. Verify Requester A's Ticket is completely absent from Requester B's list (AC-20)
    await expect(page.locator(`text=${ticketNumberA}`)).toHaveCount(0);
    await expect(page.locator(`text=${summaryA}`)).toHaveCount(0);

    // 4. Also search for Ticket Number A in Requester B's search bar to verify query filtering
    const searchInput = page.locator('input[type="search"]:visible');
    await searchInput.fill(ticketNumberA);
    await searchInput.press('Enter');

    // Must show no-results state or empty, never A's Ticket
    await expect(page.locator(`text=${ticketNumberA}`)).toHaveCount(0);
    await expect(page.locator(`text=${summaryA}`)).toHaveCount(0);
  });

  test('E2E-03 — Attachment lifecycle in the browser (AC-31, AC-35, AC-36, AC-37)', async ({
    page,
  }) => {
    // 1. Establish context as Requester A and create a ticket
    await selectRequester(page, REQUESTER_A);
    const { ticketId } = await createTicket(page, {
      summary: `Attachment Lifecycle Verification ${Date.now()}`,
      description: 'Testing upload, download, and soft removal through a real browser.',
    });

    // 2. Navigate to Ticket Detail
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.locator('h3:has-text("Attachments")')).toContainText(
      'Attachments (0 of 5)',
    );

    // 3. Upload a real PDF file via the file input (AC-31)
    const testFileName = 'network-diagnostic.pdf';
    const [uploadResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/tickets/${ticketId}/attachments`) &&
          res.request().method() === 'POST',
      ),
      page.setInputFiles('#attachment-file-input', {
        name: testFileName,
        mimeType: 'application/pdf',
        buffer: VALID_PDF_BUFFER,
      }),
    ]);

    expect(uploadResponse.status()).toBe(201);
    const attachmentData = (await uploadResponse.json()) as {
      id: number;
      originalFilename: string;
    };
    const attachmentId = attachmentData.id;

    // Verify attachment appears in Active Attachments list
    await expect(page.locator('h3:has-text("Attachments")')).toContainText(
      'Attachments (1 of 5)',
    );
    const activeItem = page.locator(`li:has-text("${testFileName}")`);
    await expect(activeItem).toBeVisible();
    await expect(activeItem).toContainText(REQUESTER_A);

    // 4. Download the attachment and verify original filename (AC-35)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      activeItem.locator('a:has-text("Download")').click(),
    ]);
    expect(download.suggestedFilename()).toBe(testFileName);

    // 5. Soft-remove attachment with reason (AC-36, AC-38, BR-22, BR-42)
    await activeItem.locator('button:has-text("Remove")').click();

    // ConfirmDialog opens
    const dialog = page.locator('.modal:has-text("Remove Attachment")');
    await expect(dialog).toBeVisible();

    const removeBtn = dialog.locator('button:has-text("Remove")');
    // Disabled without reason (AC-38)
    await expect(removeBtn).toBeDisabled();

    // Type reason
    const reasonText = 'Uploaded outdated diagnostic log';
    await dialog.locator('#removal-reason').fill(reasonText);
    await expect(removeBtn).toBeEnabled();

    // Submit removal
    const [removalResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/attachments/${attachmentId}/removal`) &&
          res.request().method() === 'POST',
      ),
      removeBtn.click(),
    ]);
    expect(removalResponse.status()).toBe(200);

    // Verify moves to Removed group (AC-36)
    await expect(page.locator('h3:has-text("Attachments")')).toContainText(
      'Attachments (0 of 5)',
    );
    const removedHeading = page.locator('h4:has-text("Removed Attachments")');
    await expect(removedHeading).toBeVisible();

    const removedList = page.locator('h4:has-text("Removed Attachments") + ul');
    await expect(removedList).toBeVisible();
    await expect(removedList).toContainText(testFileName);
    await expect(removedList).toContainText(`Reason: ${reasonText}`);
    await expect(removedList).toContainText(REQUESTER_A);

    // Ensure no download or preview control is rendered for removed attachment (BR-39)
    await expect(removedList.locator('a:has-text("Download")')).toHaveCount(0);
    await expect(removedList.locator('button:has-text("Preview")')).toHaveCount(0);

    // 6. Direct request to removed attachment content URL is refused (404) (AC-37)
    const contentStatus = await page.evaluate(async (url) => {
      const storedId = localStorage.getItem('toktickit_requester_id');
      const res = await fetch(url, {
        headers: storedId ? { 'X-Requester-Id': storedId } : {},
      });
      return res.status;
    }, `/api/attachments/${attachmentId}/content`);
    expect(contentStatus).toBe(404);
  });

  test("E2E-05 — Direct navigation to another Requester's Ticket URL (AC-30)", async ({
    page,
  }) => {
    // 1. Establish context as Requester A and create a confidential Ticket
    await selectRequester(page, REQUESTER_A);
    const confidentialSummary = `Confidential Ticket A for E2E-05 ${Date.now()}`;
    const { ticketId: ticketIdA, ticketNumber: ticketNumberA } = await createTicket(
      page,
      {
        summary: confidentialSummary,
        description: 'Super sensitive security credentials and confidential logs.',
      },
    );

    // 2. Switch to Requester B (AC-04)
    await switchRequester(page, REQUESTER_B);

    // 3. Directly navigate to Requester A's Ticket URL (AC-30)
    let apiResponseBody: unknown = null;
    let apiResponseStatus = 0;

    page.on('response', async (res) => {
      if (res.url().includes(`/api/tickets/${ticketIdA}`)) {
        apiResponseStatus = res.status();
        try {
          apiResponseBody = await res.json();
        } catch {
          apiResponseBody = null;
        }
      }
    });

    await page.goto(`/tickets/${ticketIdA}`);

    // 4. Assert UI renders Not Found state
    await expect(page.locator('h2:has-text("Ticket Not Found")')).toBeVisible();
    await expect(
      page.locator('text=This ticket does not exist or you do not have permission to view it.'),
    ).toBeVisible();

    // 5. Assert neither the summary nor the ticket number appears anywhere in the UI
    await expect(page.locator(`text=${confidentialSummary}`)).toHaveCount(0);
    await expect(page.locator(`text=${ticketNumberA}`)).toHaveCount(0);

    // 6. Assert API status was 404 and response body contained no ticket data
    expect(apiResponseStatus).toBe(404);
    const bodyString = JSON.stringify(apiResponseBody || {});
    expect(bodyString).not.toContain(confidentialSummary);
    expect(bodyString).not.toContain(ticketNumberA);
  });
});
