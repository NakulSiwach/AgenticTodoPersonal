import { expect, test } from "@playwright/test";

// Requires migration 0005 in the target database, plus E2E_EMAIL / E2E_PASSWORD (see docs/06).
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run e2e tests");

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel("New todo")).toBeVisible();
});

test("add, pause, edit and delete a daily reminder", async ({ page, isMobile }) => {
  const text = `e2e reminder ${Date.now()}`;
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: /^Reminders/ }).click();
  await expect(page.getByRole("heading", { name: "New reminder" })).toBeVisible();

  await page.getByLabel("Reminder", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const all = page.getByRole("region", { name: "All reminders" });
  const today = page.getByRole("region", { name: "Due today" });
  await expect(all).toContainText(text);
  await expect(today).toContainText(text);

  // Saved, not just on screen.
  await page.reload();
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: /^Reminders/ }).click();
  await expect(all).toContainText(text);

  await page.getByRole("switch", { name: `Pause: ${text}` }).click();
  await expect(today).not.toContainText(text);
  await page.getByRole("switch", { name: `Resume: ${text}` }).click();
  await expect(today).toContainText(text);

  await page.getByRole("button", { name: `Delete reminder: ${text}` }).click();
  await expect(all).not.toContainText(text);
  await page.reload();
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: /^Reminders/ }).click();
  await expect(page.getByRole("heading", { name: "New reminder" })).toBeVisible();
  await expect(page.getByText(text)).toHaveCount(0);
});
