import { chromium } from "@playwright/test";
import path from "node:path";

const OUT_DIR = path.resolve("artifacts/demo-prints");
const BASE = "http://127.0.0.1:3000";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`);
  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 30_000 }),
    page.getByRole("button", { name: /entrar no painel/i }).click()
  ]);

  await page.goto(`${BASE}/fichas`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(OUT_DIR, "fichas.png"), fullPage: true });
  console.log("captured /fichas");

  await page.goto(`${BASE}/itens`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(OUT_DIR, "itens.png"), fullPage: true });
  console.log("captured /itens");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
