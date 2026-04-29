import { chromium } from "playwright";
import { resolve } from "node:path";
const BASE_URL = "http://localhost:3000";
const OUT = resolve("docs/qa/screenshots-phase9");
const NAV = 300_000;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();

try {
  console.log("login...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: NAV });
  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar no painel/i }).click();
  // Wait for URL change away from /login (any post-login route)
  await page.waitForURL((url) => !url.toString().endsWith("/login"), { timeout: NAV });
  console.log("  logged in, landed on:", page.url());

  for (const [url, name] of [
    ["/itens/item-tomate", "04-itens-edit-item-tomate.png"],
    ["/fichas/ficha-molho-v1", "05-fichas-edit-ficha-molho-v1.png"],
  ]) {
    console.log(`→ ${url}`);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: "domcontentloaded", timeout: NAV });
    await page.waitForTimeout(3000);
    // Detect Next.js error overlay or server error page
    const hasError = await page.getByText(/Server Error|Jest worker|This error happened/i).count();
    if (hasError > 0) {
      console.warn(`  ⚠ server error page — waiting 15s and retrying ${url}`);
      await page.waitForTimeout(15000);
      await page.goto(`${BASE_URL}${url}`, { waitUntil: "domcontentloaded", timeout: NAV });
      await page.waitForTimeout(3000);
    }
    const out = resolve(OUT, name);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  saved → ${out}`);
  }
} finally {
  await browser.close();
}
