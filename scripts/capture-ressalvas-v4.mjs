// Captura prints das 3 ressalvas v4 (tooltips no Quadro Final)
// Uso: node scripts/capture-ressalvas-v4.mjs
// Requer: dev server em http://127.0.0.1:3000

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT_DIR = resolve("prints-cliente/ressalvas-v4");
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 1100 };
const NAV_TIMEOUT = 240_000;

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: NAV_TIMEOUT });

  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');

  // Wait for inputs to be interactive (React hydration)
  await emailInput.waitFor({ state: "visible", timeout: NAV_TIMEOUT });
  await passwordInput.waitFor({ state: "visible", timeout: NAV_TIMEOUT });

  // Click the admin demo chip to populate via React state (ensures the server action
  // receives the credentials)
  await page.locator('.MuiChip-root', { hasText: /^admin$/ }).first().click();

  // Confirm React state flushed into the inputs before submitting
  await page.waitForFunction(
    () => {
      const e = document.querySelector('input[name="email"]');
      const p = document.querySelector('input[name="password"]');
      return e?.value === "admin@sis-restaurante.local" && p?.value === "admin123";
    },
    { timeout: 10_000 }
  );

  await Promise.all([
    page.waitForURL((u) => !u.toString().endsWith("/login"), { timeout: NAV_TIMEOUT }),
    page.getByRole("button", { name: /entrar no painel/i }).click(),
  ]);
}

async function firstFichaId(page) {
  // Navigate directly to a known seeded ficha — row-click navigation in the
  // MUI DataGrid isn't always reliable under Playwright.
  const fichaId = process.env.FICHA_ID ?? "ficha-prato-v3";
  await page.goto(`${BASE_URL}/fichas/${fichaId}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  return fichaId;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    console.log("[1/5] login...");
    await login(page);

    console.log("[2/5] abrindo primeira ficha...");
    const fichaId = await firstFichaId(page);
    console.log(`  fichaId = ${fichaId}`);

    // Give MUI / suspense a moment to render the Quadro Final
    await page.waitForTimeout(2500);

    // Scroll Quadro Final into view by targeting its section title
    console.log("[3/5] scrollando ate Quadro Final...");
    const quadro = page.getByText("Quadro final da ficha", { exact: false }).first();
    await quadro.waitFor({ timeout: NAV_TIMEOUT });
    await quadro.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // Print 0: estado inicial do strip Pesos e Rendimento
    const stripScreenshot = resolve(OUT_DIR, "00-strip-inicial.png");
    const stripBox = page.locator('text=Pesos e Rendimento').first();
    await stripBox.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: stripScreenshot, fullPage: false });
    console.log(`  saved -> ${stripScreenshot}`);

    // Print 1: close-up do strip com os 4 cards e as legendas visiveis
    // (o cliente definiu "tooltip" como legenda SEMPRE visivel abaixo do
    //  valor, entao basta um screenshot estatico — nao ha hover).
    console.log("[4/5] close-up do strip Pesos e Rendimento...");
    const snap1 = resolve(OUT_DIR, "01-strip-close-up.png");
    // crop approximate: start where "Pesos e Rendimento" label is,
    // cover about 180px vertical (strip height). Use clip for tight shot.
    const box = await stripBox.boundingBox();
    if (box) {
      await page.screenshot({
        path: snap1,
        clip: { x: Math.max(0, box.x - 16), y: Math.max(0, box.y - 8), width: 1280, height: 220 }
      });
    } else {
      await page.screenshot({ path: snap1, fullPage: false });
    }
    console.log(`  saved -> ${snap1}`);

    // Print 2: Quadro Final completo (mostra os 4 cards do strip + custos + margem)
    console.log("[5/5] Quadro Final completo...");
    const quadroFinalBox = quadro.locator('xpath=..').first();
    const qfBox = await quadroFinalBox.boundingBox();
    const snap2 = resolve(OUT_DIR, "02-quadro-final-completo.png");
    if (qfBox) {
      await page.screenshot({
        path: snap2,
        clip: { x: Math.max(0, qfBox.x - 16), y: Math.max(0, qfBox.y - 8), width: 1400, height: Math.min(900, qfBox.height + 40) }
      });
    } else {
      await page.screenshot({ path: snap2, fullPage: false });
    }
    console.log(`  saved -> ${snap2}`);

    // Print 3: Leitura Operacional Consolidada (Despesa Variavel em R$ — ja correto)
    console.log("[extra] print da Leitura Operacional (Despesa Variavel em R$)...");
    const leitura = page.getByText("Leitura Operacional Consolidada", { exact: false }).first();
    await leitura.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const snap4 = resolve(OUT_DIR, "04-leitura-operacional-MARROM.png");
    await page.screenshot({ path: snap4, fullPage: false });
    console.log(`  saved -> ${snap4}`);

    // Print 5: full page geral (para validar nada mais quebrou)
    const snap5 = resolve(OUT_DIR, "05-full-page.png");
    await page.screenshot({ path: snap5, fullPage: true });
    console.log(`  saved -> ${snap5}`);

    console.log("OK");
  } catch (err) {
    console.error("FAIL:", err?.message ?? err);
    const crashShot = resolve(OUT_DIR, "99-crash.png");
    try {
      await page.screenshot({ path: crashShot, fullPage: true });
      console.error(`  crash screenshot -> ${crashShot}`);
    } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
