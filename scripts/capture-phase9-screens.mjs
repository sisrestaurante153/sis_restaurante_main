// Captura screenshots das 4 telas Phase 9 (itens/[id], itens/novo, fichas/[id], fichas/nova)
// Uso: node scripts/capture-phase9-screens.mjs
// Requer: dev server em http://localhost:3000

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("docs/qa/screenshots-phase9");
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 1100 };

const NAV_TIMEOUT = 240_000;
const ONLY = process.argv.slice(2); // optional: capture only the listed steps, e.g. "itens-novo fichas-nova"

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: NAV_TIMEOUT }),
    page.getByRole("button", { name: /entrar no painel/i }).click(),
  ]);
}

async function firstDetailId(page, section, rowSelector) {
  await page.goto(`${BASE_URL}/${section}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await page.waitForSelector(rowSelector, { timeout: NAV_TIMEOUT });
  const firstRow = page.locator(rowSelector).first();
  await Promise.all([
    page.waitForURL(new RegExp(`/${section}/[^/]+$`), { timeout: NAV_TIMEOUT }),
    firstRow.click(),
  ]);
  const url = new URL(page.url());
  return url.pathname.replace(`/${section}/`, "");
}

const firstItemId = (page) =>
  firstDetailId(page, "itens", '[data-testid="items-table"] tbody tr');
const firstFichaId = (page) =>
  firstDetailId(page, "fichas", 'main table tbody tr');

async function snap(page, url, outName) {
  await page.goto(`${BASE_URL}${url}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await page.waitForTimeout(1500); // let MUI finish mounting
  const path = resolve(OUT_DIR, outName);
  await page.screenshot({ path, fullPage: true });
  console.log(`  saved → ${path}`);
  return path;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    console.log("[1/5] login...");
    await login(page);

    const want = (name) => ONLY.length === 0 || ONLY.includes(name);

    if (want("itens-novo")) {
      console.log("[2/5] /itens/novo");
      await snap(page, "/itens/novo", "02-itens-novo.png");
    }

    if (want("fichas-nova")) {
      console.log("[3/5] /fichas/nova");
      await snap(page, "/fichas/nova", "03-fichas-nova.png");
    }

    if (want("itens-edit")) {
      console.log("[4/5] /itens/[id]  (first item from /itens)");
      const itemId = await firstItemId(page);
      if (!itemId) throw new Error("no item found in /itens");
      await snap(page, `/itens/${itemId}`, `04-itens-${itemId}.png`);
    }

    if (want("fichas-edit")) {
      console.log("[5/5] /fichas/[id]  (first ficha from /fichas)");
      const fichaId = await firstFichaId(page);
      if (!fichaId) throw new Error("no ficha found in /fichas");
      await snap(page, `/fichas/${fichaId}`, `05-fichas-${fichaId}.png`);
    }

    console.log("\ndone — screenshots in docs/qa/screenshots-phase9/");
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
