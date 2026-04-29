// Captura print completo da tela de edicao da ficha, com zooms especificos
// para validar: (a) V3 removido do IDENTIFICACAO, (b) alinhamento da grade.
// Uso: node scripts/capture-ficha-edit.mjs

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT_DIR = resolve("prints-cliente/ressalvas-v4");
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 1100 };
const NAV_TIMEOUT = 120_000;

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: NAV_TIMEOUT });
  const emailInput = page.locator('input[name="email"]');
  await emailInput.waitFor({ state: "visible", timeout: NAV_TIMEOUT });
  await page.locator('.MuiChip-root', { hasText: /^admin$/ }).first().click();
  await page.waitForFunction(
    () => document.querySelector('input[name="email"]')?.value === "admin@sis-restaurante.local",
    { timeout: 10_000 }
  );
  await Promise.all([
    page.waitForURL((u) => !u.toString().endsWith("/login"), { timeout: NAV_TIMEOUT }),
    page.getByRole("button", { name: /entrar no painel/i }).click(),
  ]);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  try {
    await login(page);
    const fichaId = process.env.FICHA_ID ?? "ficha-prato-v3";
    await page.goto(`${BASE_URL}/fichas/${fichaId}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await page.waitForTimeout(3000);

    // 1. Close-up do IDENTIFICACAO (topo) — validar V3 removido
    const identificacao = page.getByText("IDENTIFICACAO", { exact: false }).first();
    await identificacao.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const idBox = await identificacao.boundingBox();
    const snap1 = resolve(OUT_DIR, "06a-identificacao-sem-v3.png");
    if (idBox) {
      await page.screenshot({
        path: snap1,
        clip: { x: Math.max(0, idBox.x - 20), y: Math.max(0, idBox.y - 20), width: 1340, height: 280 }
      });
    } else {
      await page.screenshot({ path: snap1, fullPage: false });
    }
    console.log(`  saved -> ${snap1}`);

    // 2. Close-up da grade Estrutura da Ficha
    const estrutura = page.getByText("ESTRUTURA DA FICHA", { exact: false }).first();
    await estrutura.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const estBox = await estrutura.boundingBox();
    const snap2 = resolve(OUT_DIR, "06b-grade-estrutura.png");
    if (estBox) {
      await page.screenshot({
        path: snap2,
        clip: { x: Math.max(0, estBox.x - 20), y: Math.max(0, estBox.y - 20), width: 1340, height: 400 }
      });
    } else {
      await page.screenshot({ path: snap2, fullPage: false });
    }
    console.log(`  saved -> ${snap2}`);

    // 3. Full page de controle
    const snap3 = resolve(OUT_DIR, "06-full-page.png");
    await page.screenshot({ path: snap3, fullPage: true });
    console.log(`  saved -> ${snap3}`);

    console.log("OK");
  } catch (err) {
    console.error("FAIL:", err?.message ?? err);
    const crash = resolve(OUT_DIR, "99-crash-ficha-edit.png");
    try { await page.screenshot({ path: crash, fullPage: true }); } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
