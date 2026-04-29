import { chromium } from "playwright";
import { resolve } from "node:path";
const BASE_URL = "http://localhost:3000";
const OUT = resolve("docs/qa/screenshots-phase9");
const NAV = 180_000;
const [path, name] = process.argv.slice(2);
if (!path || !name) { console.error("usage: node scripts/capture-one.mjs <path> <filename>"); process.exit(2); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();
try {
  console.log("login...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: NAV });
  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar no painel/i }).click();
  await page.waitForURL((u) => !u.toString().endsWith("/login"), { timeout: NAV });
  console.log("  landed:", page.url());

  console.log(`→ ${path}`);
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: NAV });
  await page.waitForTimeout(4000);
  // Detect server error
  const errorText = await page.locator('body').innerText();
  if (/Jest worker|Server Error|This error happened/.test(errorText)) {
    console.warn("  ⚠ server error detected — retrying after 20s");
    await page.waitForTimeout(20000);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: NAV });
    await page.waitForTimeout(4000);
  }
  const out = resolve(OUT, name);
  await page.screenshot({ path: out, fullPage: true });
  console.log(`  saved → ${out}`);
} finally {
  await browser.close();
}
