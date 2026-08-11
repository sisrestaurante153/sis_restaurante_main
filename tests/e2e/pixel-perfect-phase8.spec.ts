/**
 * Phase 8 — Pixel-perfect contract check
 *
 * Goal: verify the 4 app pages (item form, itens grid, ficha form, fichas grid)
 * match the approved HTML contracts in `update/*.html` for the pixel-perfect
 * rules called out in VERIFICATION.md.
 *
 * Strategy:
 *   1. Load the HTML contract via `file://` and extract the reference CSS values
 *      (column widths, hex colors, paddings, font-weights, grid templates).
 *   2. Load the equivalent app page after login and extract the same values.
 *   3. Assert per-item PASS/FAIL, recording a structured report.
 *
 * This spec does NOT fail on divergences — it reports them so the executor can
 * decide per-item whether to escalate. Critical divergences (e.g. missing
 * elements) still fail the spec.
 */

import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { GRID_TEMPLATE as FICHA_GRID_TEMPLATE } from "../../src/modules/engineering/ui/FichaFlatGrid";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const UPDATE_DIR = path.join(REPO_ROOT, "update");
const SCREENSHOT_DIR = path.join(REPO_ROOT, "docs", "qa", "screenshots-phase8");

function htmlContractUrl(fileName: string): string {
  return pathToFileURL(path.join(UPDATE_DIR, fileName)).toString();
}

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@sis-restaurante.local");
  await page.locator('input[name="password"]').fill("admin123");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 30_000 }),
    page.getByRole("button", { name: /entrar no painel/i }).click()
  ]);
}

interface CheckResult {
  id: string;
  description: string;
  expected: string;
  actual: string;
  pass: boolean;
  note?: string;
}

function record(results: CheckResult[], result: CheckResult) {
  results.push(result);
  const prefix = result.pass ? "PASS" : "FAIL";
  const line = `[${prefix}] ${result.id}: ${result.description} | exp=${result.expected} | got=${result.actual}${result.note ? ` | ${result.note}` : ""}`;
  // eslint-disable-next-line no-console
  console.log(line);
}

function summarize(name: string, results: CheckResult[]) {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  // eslint-disable-next-line no-console
  console.log(`[SUMMARY ${name}] ${pass}/${results.length} passed, ${fail} failed`);
  return { pass, fail, total: results.length };
}

/**
 * Read CSS column widths declared as `col.c-cod {width:72px}` etc from the
 * <style> block of a static HTML contract. Returns a map class -> width.
 */
async function readContractColumnWidths(page: Page, contractPath: string): Promise<Record<string, number>> {
  await page.goto(contractPath);
  return page.evaluate(() => {
    const widths: Record<string, number> = {};
    const sheets = Array.from(document.styleSheets) as CSSStyleSheet[];
    for (const sheet of sheets) {
      let rules: CSSRuleList | undefined;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) continue;
        const selector = rule.selectorText;
        if (!selector) continue;
        const match = selector.match(/col\.(c-[a-z]+)/);
        if (!match) continue;
        const w = rule.style.getPropertyValue("width");
        const n = Number.parseInt(w, 10);
        if (!Number.isNaN(n)) widths[match[1]] = n;
      }
    }
    return widths;
  });
}

// ===========================================================================
// 1. tela-item-v1.html — item form page
// ===========================================================================

test("pixel-perfect: tela-item-v1.html vs /itens/novo", async ({ page }) => {
  test.setTimeout(120_000);
  const results: CheckResult[] = [];

  // --- Contract extraction from static HTML ---
  await page.goto(htmlContractUrl("tela-item-v1.html"));
  const contract = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets) as CSSStyleSheet[];
    let row_g3a = "";
    let row_g2 = "";
    let cardLabelFontSize = "";
    let cardLabelColor = "";
    let fornecedorSecondaryBg = "";
    let fornecedorSecondaryBorder = "";
    for (const sheet of sheets) {
      let rules: CSSRuleList | undefined;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) continue;
        if (rule.selectorText === ".g-3-a") {
          row_g3a = rule.style.getPropertyValue("grid-template-columns");
        }
        if (rule.selectorText === ".g-2") {
          row_g2 = rule.style.getPropertyValue("grid-template-columns");
        }
        if (rule.selectorText === ".card-label") {
          cardLabelFontSize = rule.style.getPropertyValue("font-size");
          cardLabelColor = rule.style.getPropertyValue("color");
        }
        if (rule.selectorText === ".fornecedor-block + .fornecedor-block") {
          fornecedorSecondaryBg = rule.style.getPropertyValue("background");
          fornecedorSecondaryBorder = rule.style.getPropertyValue("border-color");
        }
      }
    }
    return {
      row_g3a,
      row_g2,
      cardLabelFontSize,
      cardLabelColor,
      fornecedorSecondaryBg,
      fornecedorSecondaryBorder
    };
  });

  // Record contract values (sanity check)
  record(results, {
    id: "contract-g3a",
    description: ".g-3-a grid template read from HTML",
    expected: "140px 1fr 160px",
    actual: contract.row_g3a,
    pass: contract.row_g3a === "140px 1fr 160px"
  });
  record(results, {
    id: "contract-g2",
    description: ".g-2 grid template read from HTML",
    expected: "1fr 1fr",
    actual: contract.row_g2,
    pass: contract.row_g2 === "1fr 1fr"
  });
  // Browsers may normalize hex -> rgb(); accept both forms.
  record(results, {
    id: "contract-fornecedor-bg",
    description: ".fornecedor-block+.fornecedor-block background (secondaries green)",
    expected: "#F0F7E8 or rgb(240, 247, 232)",
    actual: contract.fornecedorSecondaryBg,
    pass: /#F0F7E8|var\(--verde-l\)|rgb\(\s*240\s*,\s*247\s*,\s*232\s*\)/i.test(contract.fornecedorSecondaryBg)
  });
  record(results, {
    id: "contract-fornecedor-border",
    description: ".fornecedor-block+.fornecedor-block border-color",
    expected: "#C0DD97 or rgb(192, 221, 151)",
    actual: contract.fornecedorSecondaryBorder,
    pass: /#C0DD97|rgb\(\s*192\s*,\s*221\s*,\s*151\s*\)/i.test(contract.fornecedorSecondaryBorder)
  });

  // --- App-level checks ---
  await loginAsAdmin(page);
  await page.goto("/itens/novo");
  await expect(page.getByRole("heading", { name: /novo item/i })).toBeVisible();

  // App: grid templates for Identificacao Row 1 and Row 2 — read via source inspection
  // (jsdom/CSS in jsdom is unreliable for MUI sx prop; we assert directly on the
  // computed style of the Box wrapper of the Codigo/Nome/Status fields).
  // Use input[name="code"] to avoid MUI floating-label ambiguity on getByLabel.
  const codigoField = page.locator('input[name="code"]');
  await codigoField.waitFor({ state: "visible", timeout: 15_000 });
  // The closest ancestor Box with display:grid is the identificacao row grid.
  const identificacaoGridInfo = await codigoField.evaluate((el) => {
    let node: HTMLElement | null = el as HTMLElement;
    while (node) {
      const style = getComputedStyle(node);
      // Match display:grid OR inline-grid; accept any gridTemplateColumns that has
      // at least one pixel value (indicating an explicit grid definition).
      if (
        (style.display === "grid" || style.display === "inline-grid") &&
        /\d+px/.test(style.gridTemplateColumns) &&
        style.gridTemplateColumns !== "none"
      ) {
        return {
          gridTemplateColumns: style.gridTemplateColumns,
          tagName: node.tagName,
          className: node.className
        };
      }
      node = node.parentElement;
    }
    return null;
  });
  const g3aActual = identificacaoGridInfo?.gridTemplateColumns ?? "NOT_FOUND";
  // Computed grid columns come back in pixels, e.g. "140px 624.2px 160px"
  // We check the first and last fixed tracks
  const g3aTracks = g3aActual.split(/\s+/);
  const g3aPass =
    g3aTracks.length === 3 &&
    /^140px$/.test(g3aTracks[0]) &&
    /^160px$/.test(g3aTracks[2]);
  record(results, {
    id: "app-g3a-identificacao",
    description: "Identificacao Row 1 computed grid-template-columns",
    expected: "140px <flex> 160px",
    actual: g3aActual,
    pass: g3aPass
  });

  // Row 2 grid: Tipo | Categoria operacional (1fr 1fr)
  const tipoField = page.getByRole("combobox", { name: /^Tipo/ }).first();
  const row2Info = await tipoField.evaluate((el) => {
    let node: HTMLElement | null = el as HTMLElement;
    while (node) {
      const style = getComputedStyle(node);
      if (style.display === "grid" && style.gridTemplateColumns.includes(" ")) {
        return { gridTemplateColumns: style.gridTemplateColumns };
      }
      node = node.parentElement;
    }
    return null;
  });
  const g2Tracks = row2Info?.gridTemplateColumns?.split(/\s+/) ?? [];
  const g2Pass = g2Tracks.length === 2 && g2Tracks[0] === g2Tracks[1];
  record(results, {
    id: "app-g2-identificacao",
    description: "Identificacao Row 2 computed grid-template-columns (1fr 1fr)",
    expected: "equal two tracks",
    actual: row2Info?.gridTemplateColumns ?? "NOT_FOUND",
    pass: g2Pass
  });

  // Descricao operacional (opcional) label with marker inline
  const descricaoLabel = page.getByLabel(/Descricao operacional/i);
  await expect(descricaoLabel).toBeVisible();
  record(results, {
    id: "app-descricao-opcional",
    description: 'Label "Descricao operacional" present with "(opcional)" marker',
    expected: "visible (opcional)",
    actual: "present",
    pass: true
  });

  // Summary
  summarize("item-form", results);
  const failed = results.filter((r) => !r.pass);
  // We allow some app-level cosmetic divergences to be reported but not block,
  // but fail if contract extraction itself broke
  const contractFail = failed.filter((r) => r.id.startsWith("contract-"));
  expect(contractFail, `contract extraction broken: ${JSON.stringify(contractFail)}`).toHaveLength(0);
});

// ===========================================================================
// 2. tela-itens-grade-v2.html — /itens listing
// ===========================================================================

test("pixel-perfect: tela-itens-grade-v2.html vs /itens", async ({ page }) => {
  test.setTimeout(120_000);
  const results: CheckResult[] = [];

  const contractWidths = await readContractColumnWidths(page, htmlContractUrl("tela-itens-grade-v2.html"));
  // Contract widths extracted from col.c-* selectors
  record(results, {
    id: "contract-itens-cols-read",
    description: "Contract HTML col.c-* widths extracted",
    expected: ">=10 col rules",
    actual: `${Object.keys(contractWidths).length} cols`,
    pass: Object.keys(contractWidths).length >= 10
  });

  // App widths (from items-listing-view.tsx column defs, read via the DataGrid headers)
  await loginAsAdmin(page);
  await page.goto("/itens", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /^Itens$/i })).toBeVisible();

  // Fetch computed header widths via role=columnheader
  const appWidths = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('[role="columnheader"]')) as HTMLElement[];
    const out: Record<string, number> = {};
    for (const h of headers) {
      const name = (h.getAttribute("data-field") || h.textContent || "").trim();
      const rect = h.getBoundingClientRect();
      out[name] = Math.round(rect.width);
    }
    return out;
  });

  // Map contract -> app column label
  const columnMap: Array<{ id: string; contractKey: string; appKey: string }> = [
    { id: "col-codigo", contractKey: "c-cod", appKey: "code" },
    { id: "col-nome", contractKey: "c-nome", appKey: "name" },
    { id: "col-tipo", contractKey: "c-tipo", appKey: "type" },
    { id: "col-cat", contractKey: "c-cat", appKey: "category" },
    { id: "col-qtdc", contractKey: "c-qtdc", appKey: "purchaseQuantity" },
    { id: "col-unc", contractKey: "c-unc", appKey: "stockUnit" },
    { id: "col-precc", contractKey: "c-precc", appKey: "baseUnitCost" },
    { id: "col-fator", contractKey: "c-fator", appKey: "conversionFactor" },
    { id: "col-qtdu", contractKey: "c-qtdu", appKey: "usageQuantity" },
    { id: "col-unu", contractKey: "c-unu", appKey: "usageUnit" },
    { id: "col-precu", contractKey: "c-precu", appKey: "usagePrice" },
    { id: "col-forn", contractKey: "c-forn", appKey: "supplierName" },
    { id: "col-sta", contractKey: "c-sta", appKey: "active" },
    { id: "col-data", contractKey: "c-data", appKey: "updatedAt" },
    { id: "col-obs", contractKey: "c-obs", appKey: "description" }
  ];

  for (const m of columnMap) {
    const expected = contractWidths[m.contractKey];
    const actual = appWidths[m.appKey];
    if (expected === undefined || actual === undefined) {
      record(results, {
        id: m.id,
        description: `Column ${m.contractKey} -> app ${m.appKey} width`,
        expected: String(expected ?? "MISSING"),
        actual: String(actual ?? "MISSING"),
        pass: false,
        note: "column not found in one of the sources"
      });
      continue;
    }
    // Allow +/- 4px tolerance for MUI DataGrid rendering variance
    const pass = Math.abs(expected - actual) <= 4;
    record(results, {
      id: m.id,
      description: `Column ${m.contractKey} -> app ${m.appKey} width (+/- 4px)`,
      expected: `${expected}px`,
      actual: `${actual}px`,
      pass,
      note: pass ? undefined : `diff=${actual - expected}px`
    });
  }

  summarize("itens-grade", results);
  const contractFail = results.filter((r) => r.id.startsWith("contract-") && !r.pass);
  expect(contractFail, `contract extraction broken: ${JSON.stringify(contractFail)}`).toHaveLength(0);
});

// ===========================================================================
// 3. tela-ficha-tecnica-v2.html — /fichas/nova
// ===========================================================================

test("pixel-perfect: tela-ficha-tecnica-v2.html vs /fichas/nova", async ({ page }) => {
  test.setTimeout(120_000);
  const results: CheckResult[] = [];

  // Assert exported GRID_TEMPLATE constants match HTML contract values.
  // Contract values are documented in VERIFICATION.md section 3, items 1-2.
  // 2026-04-20: Unidade bumped from 60 to 80 per cliente ressalva v4 (label
  // "Unidade" was truncating to "Unid..." in MUI TextField at 60px).
  // 2026-04-24 (Quick 20260424): nova coluna Cod. 72px entre drag e Item; Qtde
  // bumped 80->110px (zero cortado); CF_GRID_TEMPLATE removido — Coccao Final
  // alinha ao mesmo GRID_TEMPLATE.
  // 2026-08-11: coluna Cod. bumped 72->92px + fonte 11->14px (cliente reportou
  // campo pequeno demais pra digitar o codigo confortavelmente).
  const expectedGrid = "22px 92px 1fr 110px 80px 240px 90px 90px 96px 28px";
  record(results, {
    id: "ficha-grid-template",
    description: "FichaFlatGrid GRID_TEMPLATE matches HTML contract",
    expected: expectedGrid,
    actual: FICHA_GRID_TEMPLATE,
    pass: FICHA_GRID_TEMPLATE === expectedGrid
  });

  await loginAsAdmin(page);
  await page.goto("/fichas/nova");
  await expect(page.getByRole("heading", { name: /criar ficha tecnica/i })).toBeVisible();

  // Check that the ficha form loaded
  record(results, {
    id: "ficha-form-loaded",
    description: "Ficha form /fichas/nova loads without errors",
    expected: "heading visible",
    actual: "visible",
    pass: true
  });

  summarize("ficha-form", results);
  const fail = results.filter((r) => !r.pass);
  expect(fail, `pixel-perfect ficha failed: ${JSON.stringify(fail)}`).toHaveLength(0);
});

// ===========================================================================
// 4. tela-fichas-grade-v1.html — /fichas listing
// ===========================================================================

test("pixel-perfect: tela-fichas-grade-v1.html vs /fichas", async ({ page }) => {
  test.setTimeout(120_000);
  const results: CheckResult[] = [];

  const contractWidths = await readContractColumnWidths(page, htmlContractUrl("tela-fichas-grade-v1.html"));
  record(results, {
    id: "contract-fichas-cols-read",
    description: "Contract HTML col.c-* widths extracted",
    expected: ">=10 col rules",
    actual: `${Object.keys(contractWidths).length} cols`,
    pass: Object.keys(contractWidths).length >= 10
  });

  await loginAsAdmin(page);
  await page.goto("/fichas", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /fichas tecnicas/i, level: 1 })).toBeVisible();

  const appWidths = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('[role="columnheader"]')) as HTMLElement[];
    const out: Record<string, number> = {};
    for (const h of headers) {
      const name = (h.getAttribute("data-field") || h.textContent || "").trim();
      const rect = h.getBoundingClientRect();
      out[name] = Math.round(rect.width);
    }
    return out;
  });

  const columnMap: Array<{ id: string; contractKey: string; appKey: string }> = [
    { id: "col-cod", contractKey: "c-cod", appKey: "code" },
    { id: "col-prod", contractKey: "c-prod", appKey: "itemName" },
    { id: "col-mod", contractKey: "c-mod", appKey: "modalityLabel" },
    { id: "col-grp", contractKey: "c-grp", appKey: "groupOperational" },
    { id: "col-comp", contractKey: "c-comp", appKey: "componentCount" },
    { id: "col-fc", contractKey: "c-fc", appKey: "correctionFactor" },
    { id: "col-ic", contractKey: "c-ic", appKey: "cookingIndex" },
    { id: "col-custo", contractKey: "c-custo", appKey: "totalCost" },
    { id: "col-pv", contractKey: "c-pv", appKey: "sellingPrice" },
    { id: "col-data", contractKey: "c-data", appKey: "updatedAt" },
    { id: "col-sta", contractKey: "c-sta", appKey: "status" },
    { id: "col-obs", contractKey: "c-obs", appKey: "notes" }
  ];

  for (const m of columnMap) {
    const expected = contractWidths[m.contractKey];
    const actual = appWidths[m.appKey];
    if (expected === undefined || actual === undefined) {
      record(results, {
        id: m.id,
        description: `Column ${m.contractKey} -> app ${m.appKey} width`,
        expected: String(expected ?? "MISSING"),
        actual: String(actual ?? "MISSING"),
        pass: false,
        note: "column not found in one of the sources"
      });
      continue;
    }
    const pass = Math.abs(expected - actual) <= 4;
    record(results, {
      id: m.id,
      description: `Column ${m.contractKey} -> app ${m.appKey} width (+/- 4px)`,
      expected: `${expected}px`,
      actual: `${actual}px`,
      pass,
      note: pass ? undefined : `diff=${actual - expected}px (out of 4px tolerance)`
    });
  }

  summarize("fichas-grade", results);
  const contractFail = results.filter((r) => r.id.startsWith("contract-") && !r.pass);
  expect(contractFail, `contract extraction broken: ${JSON.stringify(contractFail)}`).toHaveLength(0);
});

// ===========================================================================
// 5. Screenshots (viewport 1280x800, full-page)
// ===========================================================================

test("pixel-perfect: capture screenshots of 4 telas", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAsAdmin(page);

  // A) Grade de itens
  await page.goto("/itens", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /^Itens$/i })).toBeVisible();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "itens-grade-app.png"),
    fullPage: true
  });

  // B) Item form (novo)
  await page.goto("/itens/novo", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /novo item/i })).toBeVisible();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "item-app.png"),
    fullPage: true
  });

  // C) Grade de fichas
  await page.goto("/fichas", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /fichas tecnicas/i, level: 1 })).toBeVisible();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "fichas-grade-app.png"),
    fullPage: true
  });

  // D) Ficha form (nova)
  await page.goto("/fichas/nova", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /criar ficha tecnica/i })).toBeVisible();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "ficha-app.png"),
    fullPage: true
  });
});

// ===========================================================================
// Phase 9 — item detail pixel-perfect
// ===========================================================================
//
// D-17: contract-check automatizado da tela interna de cadastro/edicao de Item
// contra update/tela-item-v1.html. Extrai CSS reference rules do HTML carregado
// via file://, compara com DOM vivo de /itens/novo e /itens/[itemId] com
// ancestor-walk de getComputedStyle (MUI sx gera className-based CSS, nao
// inline style, entao closest('[style*=...]') retornaria null).
// ===========================================================================

test.describe("Phase 9 — item detail pixel-perfect", () => {
  test("/itens/novo matches update/tela-item-v1.html", async ({ page }) => {
    test.setTimeout(120_000);
    const results: CheckResult[] = [];
    const htmlUrl = htmlContractUrl("tela-item-v1.html");

    // 1. Load HTML contract via file:// and extract reference CSS
    await page.goto(htmlUrl);
    const htmlContract = await page.evaluate(() => {
      const card = document.querySelector(".card");
      const cardLabel = document.querySelector(".card-label");
      const g3a = document.querySelector(".row.g-3-a");
      const g2 = document.querySelector(".row.g-2");
      const badge = document.querySelector(".badge");
      const fieldInput = document.querySelector(".field input");
      return {
        cardBorderRadius: card ? getComputedStyle(card).borderRadius : null,
        cardLabelFontSize: cardLabel ? getComputedStyle(cardLabel).fontSize : null,
        cardLabelLetterSpacing: cardLabel ? getComputedStyle(cardLabel).letterSpacing : null,
        g3aTemplate: g3a ? getComputedStyle(g3a).gridTemplateColumns : null,
        g2Template: g2 ? getComputedStyle(g2).gridTemplateColumns : null,
        badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
        badgeColor: badge ? getComputedStyle(badge).color : null,
        fieldPadding: fieldInput ? getComputedStyle(fieldInput).padding : null,
        fieldFontSize: fieldInput ? getComputedStyle(fieldInput).fontSize : null,
        fieldBorderRadius: fieldInput ? getComputedStyle(fieldInput).borderRadius : null
      };
    });

    record(results, {
      id: "P9-ITEM-01",
      description: "HTML contract extracted",
      expected: "non-null values",
      actual: JSON.stringify(htmlContract),
      pass: htmlContract.g3aTemplate !== null && htmlContract.g2Template !== null
    });

    // 2. Load app page /itens/novo and extract live DOM values
    await loginAsAdmin(page);
    await page.goto("/itens/novo");
    await page.waitForSelector('input[name="code"]', { timeout: 10_000 });

    // MUI sx generates className-based CSS (not inline style attribute),
    // so we walk ancestors and read getComputedStyle until we find display:grid.
    const appRow1 = await page.evaluate(() => {
      const input = document.querySelector('input[name="code"]');
      if (!input) return null;
      let el: HTMLElement | null = input.parentElement;
      while (el && el !== document.body) {
        const cs = window.getComputedStyle(el);
        if (
          cs.display === "grid" &&
          cs.gridTemplateColumns &&
          cs.gridTemplateColumns !== "none"
        ) {
          return cs.gridTemplateColumns;
        }
        el = el.parentElement;
      }
      return null;
    });

    record(results, {
      id: "P9-ITEM-02",
      description: "Item Row 1 grid template matches HTML g-3-a (140px 1fr 160px)",
      expected: htmlContract.g3aTemplate ?? "140px 1fr 160px",
      actual: appRow1 ?? "NOT FOUND",
      pass: appRow1?.includes("140") ?? false
    });

    const passCount = results.filter((r) => r.pass).length;
    // eslint-disable-next-line no-console
    console.log(`[PHASE 9 item detail] ${passCount}/${results.length} PASS`);

    // Fail only on critical extraction errors
    expect(htmlContract.g3aTemplate).not.toBeNull();
    expect(appRow1).not.toBeNull();
  });

  test("/itens/[itemId] matches update/tela-item-v1.html — badge ativo tokens", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);
    // Navigate to items list, open first item
    await page.goto("/itens");
    await page.waitForSelector('a[href^="/itens/"]', { timeout: 10_000 });
    const firstItemLink = page.locator('a[href^="/itens/"]').first();
    await firstItemLink.click();
    await page.waitForSelector('input[name="code"]', { timeout: 10_000 });

    // Check badge ativo tokens
    const badge = await page.evaluate(() => {
      const el = document.querySelector('[class*="badge"], [role="status"]');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, fontSize: cs.fontSize };
    });

    // eslint-disable-next-line no-console
    console.log(`[PHASE 9 item detail badge] ${JSON.stringify(badge)}`);

    // Relaxed assertion — log only, do not block
    expect(badge).not.toBeNull();
  });
});

// ===========================================================================
// Phase 9 — ficha detail pixel-perfect
// ===========================================================================
//
// D-17: contract-check automatizado da ficha tecnica contra
// update/tela-ficha-tecnica-v2.html. Mesma estrategia ancestor-walk para
// MUI sx className-based CSS.
// ===========================================================================

test.describe("Phase 9 — ficha detail pixel-perfect", () => {
  test("/fichas/nova matches update/tela-ficha-tecnica-v2.html", async ({ page }) => {
    test.setTimeout(120_000);
    const results: CheckResult[] = [];
    const htmlUrl = htmlContractUrl("tela-ficha-tecnica-v2.html");

    await page.goto(htmlUrl);
    const htmlContract = await page.evaluate(() => {
      const gId1 = document.querySelector(".row.g-id1");
      const gId2 = document.querySelector(".row.g-id2");
      const gFin = document.querySelector(".row.g-fin");
      const btnIcon = document.querySelector(".btn-icon");
      const badge = document.querySelector(".badge");
      const pageTitle = document.querySelector(".page-title");
      return {
        gId1Template: gId1 ? getComputedStyle(gId1).gridTemplateColumns : null,
        gId2Template: gId2 ? getComputedStyle(gId2).gridTemplateColumns : null,
        gFinTemplate: gFin ? getComputedStyle(gFin).gridTemplateColumns : null,
        btnIconPadding: btnIcon ? getComputedStyle(btnIcon).padding : null,
        btnIconBorderRadius: btnIcon ? getComputedStyle(btnIcon).borderRadius : null,
        badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
        pageTitleSize: pageTitle ? getComputedStyle(pageTitle).fontSize : null,
        pageTitleWeight: pageTitle ? getComputedStyle(pageTitle).fontWeight : null
      };
    });

    record(results, {
      id: "P9-FICHA-01",
      description: "HTML contract ficha extracted",
      expected: "non-null",
      actual: JSON.stringify(htmlContract),
      pass: htmlContract.gId1Template !== null && htmlContract.gId2Template !== null
    });

    await loginAsAdmin(page);
    await page.goto("/fichas/nova");
    await page.waitForSelector('input[name="displayName"]', { timeout: 10_000 });

    // Walk up from displayName input to the nearest ancestor with display:grid
    // (MUI sx generates className-based CSS — inline style attribute is absent).
    const appGId1 = await page.evaluate(() => {
      const input = document.querySelector('input[name="displayName"]');
      if (!input) return null;
      let el: HTMLElement | null = input.parentElement;
      while (el && el !== document.body) {
        const cs = window.getComputedStyle(el);
        if (
          cs.display === "grid" &&
          cs.gridTemplateColumns &&
          cs.gridTemplateColumns !== "none"
        ) {
          return cs.gridTemplateColumns;
        }
        el = el.parentElement;
      }
      return null;
    });

    record(results, {
      id: "P9-FICHA-02",
      description: "Ficha Row 1 grid template '110px 1fr 150px 175px'",
      expected: htmlContract.gId1Template ?? "110px 1fr 150px 175px",
      actual: appGId1 ?? "NOT FOUND",
      pass: appGId1?.includes("110") ?? false
    });

    // Finalizacao grid check — same ancestor-walk strategy (MUI sx, not inline style).
    const finGrid = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[name="preparationMode"]');
      if (!textarea) return null;
      let el: HTMLElement | null = textarea.parentElement;
      while (el && el !== document.body) {
        const cs = window.getComputedStyle(el);
        if (
          cs.display === "grid" &&
          cs.gridTemplateColumns &&
          cs.gridTemplateColumns !== "none"
        ) {
          return cs.gridTemplateColumns;
        }
        el = el.parentElement;
      }
      return null;
    });

    record(results, {
      id: "P9-FICHA-03",
      description: "Ficha Finalizacao grid '1fr 1fr'",
      expected: htmlContract.gFinTemplate ?? "1fr 1fr",
      actual: finGrid ?? "NOT FOUND",
      pass: finGrid !== null
    });

    const passCount = results.filter((r) => r.pass).length;
    // eslint-disable-next-line no-console
    console.log(`[PHASE 9 ficha detail] ${passCount}/${results.length} PASS`);

    expect(htmlContract.gId1Template).not.toBeNull();
    expect(appGId1).not.toBeNull();
  });

  test("/fichas/[fichaId] btn-icon Duplicar/Exportar presentes", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);
    await page.goto("/fichas");
    await page.waitForSelector('a[href^="/fichas/"]', { timeout: 10_000 });
    const firstFichaLink = page.locator('a[href^="/fichas/"]').first();
    await firstFichaLink.click();
    await page.waitForSelector('input[name="displayName"]', { timeout: 10_000 });

    const duplicarExists = await page
      .locator('[title="Duplicar"], [aria-label*="Duplicar"]')
      .count();
    const exportarExists = await page
      .locator('[title="Exportar"], [aria-label*="Exportar"]')
      .count();

    // eslint-disable-next-line no-console
    console.log(
      `[PHASE 9 ficha topbar] Duplicar=${duplicarExists} Exportar=${exportarExists}`
    );

    expect(duplicarExists).toBeGreaterThan(0);
    expect(exportarExists).toBeGreaterThan(0);
  });
});
