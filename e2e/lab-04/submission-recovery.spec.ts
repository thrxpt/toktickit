import { expect, test } from "@playwright/test";
import { login, TEST_USERS } from "../lab-03/helpers";

test("E2E-04 — FR-19, FR-20: lost create/upload responses retry once with preserved data", async ({ page }) => {
  await login(page, TEST_USERS.requester.email, TEST_USERS.requester.password);
  await page.waitForURL("**/dashboard");
  await page.goto("/tickets/new");
  let ticketId = 0;
  const ticketKeys: (string | undefined)[] = [];
  await page.route("**/api/tickets", async route => {
    if (route.request().method() !== "POST") return route.continue();
    ticketKeys.push(route.request().headers()["idempotency-key"]);
    if (ticketId) return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    ticketId = (await response.json()).id;
    await route.abort("failed"); // The server committed; the browser receives no response.
  });
  const fileKeys: string[] = [];
  const lostFiles = new Set<string>();
  await page.route("**/api/tickets/*/attachments", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const key = route.request().headers()["idempotency-key"];
    fileKeys.push(key);
    if (lostFiles.has(key)) return route.continue();
    lostFiles.add(key);
    expect((await route.fetch()).status()).toBe(201);
    await route.abort("failed");
  });
  await page.locator("#categoryId").selectOption({ index: 1 });
  await page.locator("#relatedSystemId").selectOption({ index: 1 });
  const summary = `E2E Retry recovery ${Date.now()}`;
  await page.locator("#summary").fill(summary);
  await page.locator("#description").fill("Retain my draft when the server response is lost.");
  await page.getByTestId("attachment-file-input").setInputFiles({
    name: "creation.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nRetry evidence\n%%EOF"),
  });
  await page.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Submission Failed" })).toBeVisible();
  await expect(page.locator("#summary")).toHaveValue(summary);
  await expect(page.getByText("creation.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByTestId("success-panel")).toBeVisible();
  expect(ticketKeys).toHaveLength(2);
  expect(ticketKeys[0]).toBeTruthy();
  expect(ticketKeys[1]).toBe(ticketKeys[0]);
  await page.getByRole("button", { name: "Retry creation.pdf" }).click();
  await expect(page.getByText("Uploaded", { exact: true })).toBeVisible();
  expect(fileKeys).toHaveLength(2);
  expect(fileKeys[1]).toBe(fileKeys[0]);
  await page.getByRole("link", { name: "View Ticket" }).click();
  await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}$`));
  await page.getByTestId("attachment-file-input").setInputFiles({
    name: "detail.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nSecond retry evidence\n%%EOF"),
  });
  await page.getByRole("button", { name: "Retry detail.pdf" }).click();
  await expect(page.getByRole("heading", { name: "Attachments (2 of 5)" })).toBeVisible();
  expect(fileKeys).toHaveLength(4);
  expect(fileKeys[3]).toBe(fileKeys[2]);
  const list = await (await page.request.get(`/api/tickets?search=${encodeURIComponent(summary)}`)).json();
  expect(list.data).toHaveLength(1);
  const attachments = await (await page.request.get(`/api/tickets/${ticketId}/attachments`)).json();
  expect(attachments.active).toHaveLength(2);
});
