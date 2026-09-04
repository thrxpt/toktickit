import { expect, type Page } from '@playwright/test';

// Seeded active requesters (from server/prisma/seed-data.ts)
export const REQUESTER_A = 'Jennifer Anderson';
export const REQUESTER_B = 'Marcus Chen';
export const REQUESTER_C = 'Somchai Prasert';
export const REQUESTER_D = 'Priya Raman';

export const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

export const VALID_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF',
);

export const DISGUISED_BUFFER = Buffer.from(
  'This is plain text pretending to be a png file',
);

/**
 * Select a development requester from /select-requester.
 */
export async function selectRequester(page: Page, requesterName: string): Promise<void> {
  await page.goto('/select-requester');
  const selectLocator = page.locator('#requester-select');
  await expect(selectLocator).toBeVisible();
  await expect(selectLocator).not.toBeDisabled();
  const optionValue = await selectLocator
    .locator('option')
    .filter({ hasText: requesterName })
    .first()
    .getAttribute('value');
  if (optionValue) {
    await selectLocator.selectOption(optionValue);
  }
  await page.click('button[type="submit"]:has-text("Continue")');
  await page.waitForURL('**/tickets');
}

/**
 * Change the development requester via the profile menu in the shell.
 */
export async function switchRequester(page: Page, requesterName: string): Promise<void> {
  await page.click('button[aria-label="Requester profile"]');
  await page.click('text=Change Requester');
  await page.waitForURL('**/select-requester');
  const selectLocator = page.locator('#requester-select');
  await expect(selectLocator).toBeVisible();
  await expect(selectLocator).not.toBeDisabled();
  const optionValue = await selectLocator
    .locator('option')
    .filter({ hasText: requesterName })
    .first()
    .getAttribute('value');
  if (optionValue) {
    await selectLocator.selectOption(optionValue);
  }
  await page.click('button[type="submit"]:has-text("Continue")');
  await page.waitForURL('**/tickets');
}

/**
 * Create a new Ticket and return the generated Ticket Number and numeric id.
 */
export async function createTicket(
  page: Page,
  options?: {
    summary?: string;
    description?: string;
    category?: string;
    relatedSystem?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  },
): Promise<{ ticketNumber: string; ticketId: number }> {
  await page.goto('/tickets/new');

  // Wait for reference dropdowns to load
  await expect(page.locator('#categoryId')).not.toBeDisabled();
  await expect(page.locator('#relatedSystemId')).not.toBeDisabled();

  // Select Category and Related System
  const categoryValue = await page
    .locator('#categoryId option')
    .filter({ hasText: options?.category || 'Software' })
    .first()
    .getAttribute('value');
  if (categoryValue) {
    await page.selectOption('#categoryId', categoryValue);
  }

  const systemValue = await page
    .locator('#relatedSystemId option')
    .filter({ hasText: options?.relatedSystem || 'Email' })
    .first()
    .getAttribute('value');
  if (systemValue) {
    await page.selectOption('#relatedSystemId', systemValue);
  }

  if (options?.priority) {
    await page.selectOption('#requestedPriority', options.priority);
  }

  const summaryText =
    options?.summary || `E2E Test Ticket - ${Date.now()}`;
  const descriptionText =
    options?.description ||
    'Detailed description of the issue for E2E automated test suite run.';

  await page.fill('#summary', summaryText);
  await page.fill('#description', descriptionText);

  // Submit and intercept response
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/api/tickets') && res.request().method() === 'POST',
    ),
    page.click('button:has-text("Create Ticket")'),
  ]);

  expect(response.status()).toBe(201);
  const ticketData = (await response.json()) as { id: number; ticketNumber: string };

  // Wait for success panel
  await expect(page.locator('[data-testid="success-panel"]')).toBeVisible();
  const displayedTicketNumber = await page
    .locator('[data-testid="ticket-number-display"]')
    .textContent();

  expect(displayedTicketNumber?.trim()).toBe(ticketData.ticketNumber);

  return {
    ticketNumber: ticketData.ticketNumber,
    ticketId: ticketData.id,
  };
}
