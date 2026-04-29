import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8081";
const ITEM_ID = process.env.ITEM_ID ?? "cmo3pwbd900002kinu5abtvb9";
const FICHA_ID = process.env.FICHA_ID ?? "cmo3pwbgd0008rwinhi8fowim";
const OUT = resolve("docs/qa/screenshots-phase9");
const NAV = 60_000;
mkdirSync(OUT, { recursive: true });

const SCREENS = [
  { path: "/itens/novo", file: "01-itens-novo.png", label: "Novo item" },
  { path: `/itens/${ITEM_ID}`, file: "02-itens-edit.png", label: "Editar item" },
  { path: "/fichas/nova", file: "03-fichas-nova.png", label: "Nova ficha" },
  { path: `/fichas/${FICHA_ID}`, file: "04-fichas-edit.png", label: "Editar ficha" },
];

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

  for (const s of SCREENS) {
    console.log(`→ ${s.label}  (${s.path})`);
    await page.goto(`${BASE_URL}${s.path}`, { waitUntil: "domcontentloaded", timeout: NAV });
    await page.waitForTimeout(2500);
    const out = resolve(OUT, s.file);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  saved → ${out}`);
  }
  console.log("\nall done");
} finally {
  await browser.close();
}
