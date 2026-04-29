import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:3000";
const APP_EMAIL = process.env.APP_EMAIL ?? "admin@sis-restaurante.local";
const APP_PASSWORD = process.env.APP_PASSWORD ?? "admin123";
const OUTPUT_DIR = join(process.cwd(), "output", "playwright");

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 2200 } });

  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(APP_EMAIL);
  await page.getByLabel("Senha").fill(APP_PASSWORD);
  await page.getByRole("button", { name: /entrar no painel/i }).click();
  await page.waitForURL("**/dashboard");

  await page.goto(`${APP_URL}/fichas/nova?scope=finais`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(OUTPUT_DIR, "baseline-ficha-nova.png"),
    fullPage: true
  });

  await page.goto(`${APP_URL}/fichas`, { waitUntil: "networkidle" });
  const href = await page.locator('tbody a[href^="/fichas/"]').first().getAttribute("href");

  if (href) {
    await page.goto(`${APP_URL}${href}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: join(OUTPUT_DIR, "baseline-ficha-detalhe.png"),
      fullPage: true
    });
  }

  await browser.close();

  process.stdout.write(
    [
      "Capturas geradas:",
      `- ${join(OUTPUT_DIR, "baseline-ficha-nova.png")}`,
      `- ${join(OUTPUT_DIR, "baseline-ficha-detalhe.png")}`
    ].join("\n")
  );
}

void main();
