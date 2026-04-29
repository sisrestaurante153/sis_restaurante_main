import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.getByRole("button", { name: "Entrar no painel" }).click()
  ]);
}

test("shows the redesigned login page", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Acesse o painel" })).toBeVisible();
  await expect(page.getByText("Sessao segura em cookie HttpOnly para o ambiente operacional.")).toBeVisible();
});

test("renders grouped desktop navigation after login", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await login(page);

  await expect(page.getByRole("heading", { name: "Dashboard operacional" })).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Navegacao principal" });
  // "Visao geral" removed from sidebar to match HTML reference. Dashboard still reachable via /dashboard URL.
  await expect(sidebar.getByText("Cadastros", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Operacao", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Controle", { exact: true })).toBeVisible();
  // Sidebar logo present (HTML reference) — assert within sidebar nav container.
  await expect(sidebar.locator("xpath=ancestor::div[contains(@class,'MuiDrawer-paper')]").getByText("SIS Restaurante")).toBeVisible();
});

test("opens the mobile navigation drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await page.getByRole("button", { name: "Abrir menu principal" }).click();

  await expect(page.getByRole("navigation", { name: "Navegacao principal" })).toBeVisible();
  // Dashboard link removed from sidebar (HTML reference) — assert Fichas Tecnicas as a retained entry.
  await expect(page.getByRole("link", { name: "Fichas Tecnicas" })).toBeVisible();
  // Sair was moved from sidebar footer into the topbar user menu.
  // The UserMenu trigger lives in the mobile AppBar; it has aria-label but is not a real button element.
  await expect(page.locator('[aria-label="Abrir menu do usuario"]').first()).toBeVisible();
});
