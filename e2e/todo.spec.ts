import { expect, test } from "@playwright/test";

// Requires a real Supabase project and a dedicated test account:
//   E2E_EMAIL=... E2E_PASSWORD=... npm run e2e
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run e2e tests");

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "TaskFlow" })).toBeVisible();
});

test("signed-out visitors are redirected to /login", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await ctx.close();
});

test("add, prioritise, complete, uncomplete, colour and delete a todo", async ({ page }) => {
  const title = `e2e ${Date.now()}`;

  await page.getByLabel("New todo").fill(title);
  await page.getByRole("radio", { name: "P0" }).first().click();
  await page.getByRole("button", { name: "Add" }).click();
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText("P0");

  await row.getByRole("checkbox").check();
  await expect(row.getByRole("checkbox")).toBeChecked();
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: title }).getByRole("checkbox")).toBeChecked();

  await page.getByRole("listitem").filter({ hasText: title }).getByRole("checkbox").uncheck();
  await expect(page.getByRole("listitem").filter({ hasText: title }).getByRole("checkbox")).not.toBeChecked();

  await page.getByRole("button", { name: `Edit: ${title}` }).click();
  await page.getByRole("radio", { name: "Text color: red" }).click();
  await page.getByRole("radio", { name: "Highlight color: yellow" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await expect(page.getByText(title)).toHaveClass(/text-red-700/);
  await expect(page.getByText(title)).toHaveClass(/bg-yellow-200/);

  await page.getByRole("button", { name: `Edit: ${title}` }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(title)).toBeHidden();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByRole("button", { name: `Edit: ${title}` }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(title)).toBeHidden({ timeout: 8000 });
  await page.reload();
  await expect(page.getByText(title)).toHaveCount(0);
});
