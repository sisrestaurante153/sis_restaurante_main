import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const OUT = resolve("docs/qa/html-references");
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();
for (const html of ["tela-item-v1.html", "tela-ficha-tecnica-v2.html"]) {
  const url = pathToFileURL(resolve("update", html)).href;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(800);
  const out = resolve(OUT, html.replace(".html", ".png"));
  await page.screenshot({ path: out, fullPage: true });
  console.log("saved →", out);
}
await browser.close();
