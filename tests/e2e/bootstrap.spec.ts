import { expect, test } from "@playwright/test";

test("root redirects to login and opens the authenticated shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /acesse o painel/i })).toBeVisible();

  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.getByRole("button", { name: /entrar no painel/i }).click()
  ]);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /dashboard operacional/i })).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Navegacao principal" });

  await Promise.all([
    page.waitForURL("**/itens"),
    sidebar.getByRole("link", { name: "Itens", exact: true }).click()
  ]);
  await expect(page).toHaveURL(/\/itens$/);
  await expect(page.getByRole("heading", { name: /^Itens$/i })).toBeVisible();

  await Promise.all([
    page.waitForURL("**/fichas"),
    sidebar.getByRole("link", { name: "Fichas Tecnicas", exact: true }).click()
  ]);
  await expect(page).toHaveURL(/\/fichas$/);
  await expect(page.getByRole("heading", { level: 1, name: /fichas tecnicas/i })).toBeVisible();
});

test("healthcheck endpoint returns ok payload", async ({ request }) => {
  const response = await request.get("/api/health");
  const payload = await response.json();

  expect([200, 503]).toContain(response.status());
  expect(["ok", "degraded"]).toContain(payload.status);
});

test("consulta is blocked from write routes", async ({ page }) => {
  await page.goto("/login");

  await page.locator('input[name="email"]').fill("consulta@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("consulta123");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.getByRole("button", { name: /entrar no painel/i }).click()
  ]);

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/itens/novo");
  await expect(page).toHaveURL(/\/forbidden$/);
  await expect(page.getByRole("heading", { name: /acesso negado/i })).toBeVisible();
});
