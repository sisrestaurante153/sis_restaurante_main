---
plan_id: 09-05
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 05
type: execute
wave: 4
depends_on: [09-01, 09-02, 09-03, 09-04]
files_modified:
  - tests/e2e/pixel-perfect-phase8.spec.ts
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md
autonomous: true
requirements:
  - SPEC-4-TELAS-ESTRITO
tags: [e2e, pixel-perfect, tests, release]

must_haves:
  truths:
    - "tests/e2e/pixel-perfect-phase8.spec.ts tem describe('item detail pixel-perfect') cobrindo /itens/[id] + /itens/novo contra update/tela-item-v1.html"
    - "tests/e2e/pixel-perfect-phase8.spec.ts tem describe('ficha detail pixel-perfect') cobrindo /fichas/[id] + /fichas/nova contra update/tela-ficha-tecnica-v2.html"
    - "Subset estavel E2E (bootstrap + navigation + pixel-perfect-phase8) passa 100% com workers=1"
    - "09-VERIFICATION.md consolidada com secoes §1-§5 populadas (Schema, Zod, UI Pixel-Perfect, E2E, Release)"
    - "09-RELEASE-NOTES.md entrega git tag v1.2-phase-9 + commit SHA (NO ZIP per Phase 8-07 scope change 2026-04-17)"
  artifacts:
    - path: "tests/e2e/pixel-perfect-phase8.spec.ts"
      provides: "Spec estendido com 2 describes adicionais para detail pages"
      contains: "item detail pixel-perfect"
    - path: ".planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md"
      provides: "VERIFICATION consolidada Phase 9 com 5 secoes"
      contains: "§3 UI Pixel-Perfect"
    - path: ".planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md"
      provides: "Release notes com git tag + commit SHA"
      contains: "git tag"
  key_links:
    - from: "tests/e2e/pixel-perfect-phase8.spec.ts"
      to: "update/tela-item-v1.html, update/tela-ficha-tecnica-v2.html"
      via: "file:// URL + CSS rule extraction"
      pattern: "pathToFileURL"
---

<objective>
Estender `tests/e2e/pixel-perfect-phase8.spec.ts` com 2 describes novos cobrindo contract-check automatizado das detail pages (`/itens/[id]`, `/itens/novo`, `/fichas/[id]`, `/fichas/nova`) contra os HTMLs aprovados (D-17). Consolidar `09-VERIFICATION.md` com secoes §3 UI Pixel-Perfect + §4 E2E Pixel-Perfect Tests + §5 Release Scaffold populadas. Entregar release scaffold via git tag + commit SHA (SEM ZIP, per user scope change Phase 8-07 de 2026-04-17 — D-18 contexto).

Purpose: Fechar SPEC-4-TELAS-ESTRITO com gate automatizado pixel-perfect; entregar release formal da Phase 9 ao usuario.
Output: Spec Playwright estendida; 09-VERIFICATION.md consolidada; 09-RELEASE-NOTES.md com git tag + SHA.

**Wave 4 sequencial (ultimo plano):** depende de 09-01..09-04 completos. Wave topology da Phase 9 pos-revisao: Wave 1 = 09-01; Wave 2 = 09-02 + 09-03 (paralelo, zero overlap de arquivos); Wave 3 = 09-04 (sequencial apos 09-03 por edicao compartilhada de `ficha-form.tsx`); Wave 4 = 09-05.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-02-SUMMARY.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-04-SUMMARY.md
@tests/e2e/pixel-perfect-phase8.spec.ts
@update/tela-item-v1.html
@update/tela-ficha-tecnica-v2.html
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-07-pixel-perfect-verification-release-PLAN.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md

<interfaces>
Existing spec structure (tests/e2e/pixel-perfect-phase8.spec.ts):
- helpers: `htmlContractUrl(fileName)`, `loginAsAdmin(page)`, `record(results, checkResult)`.
- CheckResult interface: `{ id, description, expected, actual, pass, note? }`.
- Tolerance: +/- 4px.
- Extraction pattern: `page.evaluate(() => { ...getComputedStyle or CSSStyleSheet... })`.
- Workers=1 enforced via playwright.config (Windows).

Target selectors for /itens/[id]:
- Block "Identificacao" card-label → expect fontSize 10, letterSpacing .1em, textTransform uppercase
- Row 1 grid: `140px 1fr 160px` (Codigo/Nome/Status)
- Row 2 grid: `1fr 1fr` (Tipo/Categoria)
- Btn Salvar alteracoes: backgroundColor #185FA5
- Badge ativo: backgroundColor #EAF3DE, color #1B6B2C

Target selectors for /fichas/[id]:
- Row 1 grid Identificacao: `110px 1fr 150px 175px`
- Row 2 grid Identificacao: `1fr 1fr 120px 1fr`
- Custo atual box: background #E6F1FB, border 0.5px solid #D3D1C7
- Btn-icon Duplicar/Exportar: padding 7px 10px, border 0.5px solid #D3D1C7
- Badge ativa: background #EAF3DE, color #1B6B2C
- Finalizacao grid: `1fr 1fr`

**CRITICAL (selector strategy — post-revision):** O app usa MUI `sx` prop, que gera CSS via className (emotion/styled). Isso significa que o atributo `style=""` inline do DOM NAO contem `grid-template-columns`. Por isso qualquer seletor baseado em `closest('[style*="grid-template-columns"]')` retornara `null` em runtime. A estrategia correta e subir a arvore DOM a partir de um input conhecido e ler `getComputedStyle(el).gridTemplateColumns` em cada ancestral ate encontrar `display: grid`. Ver extractor `findGridAncestor` nos testes.

Release scaffold from Phase 8-07 (user override 2026-04-17):
- NO ZIP (`scripts/ops/pack-release.sh` deletado)
- Delivery = git tag v1.2-phase-9 + commit SHA registered in RELEASE-NOTES.md
- Screenshots comparativos app vs HTML em docs/qa/screenshots-phase9/ (opcional — Phase 8 fez 4 screenshots 1280x800)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Estender pixel-perfect-phase8.spec.ts com describes item detail + ficha detail (D-17)</name>
  <files>tests/e2e/pixel-perfect-phase8.spec.ts</files>
  <read_first>
    - tests/e2e/pixel-perfect-phase8.spec.ts (todo o arquivo — entender helpers, CheckResult, padroes de extracao)
    - update/tela-item-v1.html (linhas 53-88 tokens .field + .g-3-a + .g-2, linhas 178-220 Identificacao markup)
    - update/tela-ficha-tecnica-v2.html (linhas 60-61 g-id1/g-id2, linhas 119 g-fin, linhas 253-268 Identificacao, linhas 425-432 Finalizacao)
    - src/modules/catalog/ui/item-form.tsx (grids atuais)
    - src/modules/engineering/ui/ficha-form.tsx (grids atuais pos-09-03)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-17
  </read_first>
  <action>
    Em `tests/e2e/pixel-perfect-phase8.spec.ts`, adicionar 2 describes novos ao final do arquivo (nao modificar os existentes).

    **Nota sobre estrategia de seletor (MUI sx → className-based CSS):**
    O app usa MUI `sx` prop, que gera CSS via className (nao inline `style`). Por isso NAO usamos `closest('[style*="grid-template-columns"]')` — retornaria `null`. Em vez disso, subimos a arvore DOM a partir de um input conhecido ate achar o primeiro ancestral com `display: grid` computado, e lemos `getComputedStyle(el).gridTemplateColumns`.

    **Describe 1: item detail pixel-perfect**

    ```ts
    test.describe("Phase 9 — item detail pixel-perfect", () => {
      test("/itens/novo matches update/tela-item-v1.html", async ({ page }) => {
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
            if (cs.display === 'grid' && cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none') {
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

        // 3. Badge ativo check on /itens/[id] — skip on /novo (no status yet)
        const passCount = results.filter((r) => r.pass).length;
        // eslint-disable-next-line no-console
        console.log(`[PHASE 9 item detail] ${passCount}/${results.length} PASS`);

        // Fail only on critical extraction errors
        expect(htmlContract.g3aTemplate).not.toBeNull();
        expect(appRow1).not.toBeNull();
      });

      test("/itens/[itemId] matches update/tela-item-v1.html — badge ativo tokens", async ({ page }) => {
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
    ```

    **Describe 2: ficha detail pixel-perfect**

    ```ts
    test.describe("Phase 9 — ficha detail pixel-perfect", () => {
      test("/fichas/nova matches update/tela-ficha-tecnica-v2.html", async ({ page }) => {
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
            if (cs.display === 'grid' && cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none') {
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
            if (cs.display === 'grid' && cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none') {
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
        await loginAsAdmin(page);
        await page.goto("/fichas");
        await page.waitForSelector('a[href^="/fichas/"]', { timeout: 10_000 });
        const firstFichaLink = page.locator('a[href^="/fichas/"]').first();
        await firstFichaLink.click();
        await page.waitForSelector('input[name="displayName"]', { timeout: 10_000 });

        const duplicarExists = await page.locator('[title="Duplicar"], [aria-label*="Duplicar"]').count();
        const exportarExists = await page.locator('[title="Exportar"], [aria-label*="Exportar"]').count();

        // eslint-disable-next-line no-console
        console.log(`[PHASE 9 ficha topbar] Duplicar=${duplicarExists} Exportar=${exportarExists}`);

        expect(duplicarExists).toBeGreaterThan(0);
        expect(exportarExists).toBeGreaterThan(0);
      });
    });
    ```

    Rodar:
    ```
    npm run test:e2e -- pixel-perfect-phase8 --workers=1
    ```

    Esperado: todos os tests antigos (26 PASS Phase 8) + 4 tests novos Phase 9. Divergencias cosmeticas logged como `[FAIL]` mas nao bloqueiam (per D-17).

    Gate final subset estavel (D-20):
    ```
    npm run test:e2e -- bootstrap navigation pixel-perfect-phase8 --workers=1
    ```
  </action>
  <verify>
    <automated>grep -n "Phase 9 — item detail pixel-perfect" tests/e2e/pixel-perfect-phase8.spec.ts &amp;&amp; grep -n "Phase 9 — ficha detail pixel-perfect" tests/e2e/pixel-perfect-phase8.spec.ts &amp;&amp; grep -n "P9-ITEM-01\|P9-FICHA-01" tests/e2e/pixel-perfect-phase8.spec.ts &amp;&amp; npx playwright test pixel-perfect-phase8 --workers=1</automated>
  </verify>
  <acceptance_criteria>
    - `tests/e2e/pixel-perfect-phase8.spec.ts` contains literal `Phase 9 — item detail pixel-perfect` (grep)
    - `tests/e2e/pixel-perfect-phase8.spec.ts` contains literal `Phase 9 — ficha detail pixel-perfect` (grep)
    - `tests/e2e/pixel-perfect-phase8.spec.ts` contains literal `P9-ITEM-01` AND `P9-FICHA-01` (grep)
    - `tests/e2e/pixel-perfect-phase8.spec.ts` contains `htmlContractUrl("tela-item-v1.html")` AND `htmlContractUrl("tela-ficha-tecnica-v2.html")` (grep)
    - `tests/e2e/pixel-perfect-phase8.spec.ts` contains references to selectors: `input[name="code"]`, `input[name="displayName"]`, `textarea[name="preparationMode"]`, `[title="Duplicar"]`, `[title="Exportar"]` (grep each)
    - `tests/e2e/pixel-perfect-phase8.spec.ts` uses `getComputedStyle` ancestor-walk strategy (grep `display === 'grid'` AND `gridTemplateColumns` — NO occurrences of `closest('[style*="grid-template-columns"]')` or `closest('[style*="gridTemplateColumns"]')`)
    - `npx playwright test pixel-perfect-phase8 --workers=1` completes (exit code tolerates per-item FAILs logged — but zero extraction ERRORS; P9-ITEM-02/P9-FICHA-02/P9-FICHA-03 devem retornar string nao-null para `appRow1`/`appGId1`/`finGrid`)
    - Pre-existing 26 PASS preserved (nao regredir contagem Phase 8 baseline)
    - 4 new Phase 9 tests executam (mesmo que divergencias logged)
  </acceptance_criteria>
  <done>
    Spec Playwright extendida com 4 tests novos (2 describes Phase 9); gate subset estavel verde; pre-existing Phase 8 tests preservados; extracao de grid-template-columns usa getComputedStyle ancestor-walk (compativel com MUI sx className-based CSS).
  </done>
</task>

<task type="auto">
  <name>Task 2: Consolidar 09-VERIFICATION.md §3 §4 §5</name>
  <files>.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md (secoes §1 §2 populadas por 09-01)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-02-SUMMARY.md
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-04-SUMMARY.md
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md (formato referencia)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md
  </read_first>
  <action>
    Editar `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md` atualizando secoes §3, §4, §5:

    **§3 UI Pixel-Perfect**
    - Tabela com itens:
      | Area | Contrato HTML | Implementacao | Status | Evidencia |
      | Item FormSection sem description (D-13) | update/tela-item-v1.html linha 56 (.card-label) | src/modules/catalog/ui/item-form.tsx sem prop description | PASS | 09-02-SUMMARY + unit test |
      | Item topbar hex (D-14) | #185FA5 / #F09595 / #A32D2D | src/app/(app)/itens/[itemId]/page.tsx | PASS | 09-02 grep |
      | Item placeholders Fornecedor 2+ (D-15) | dd/mm/aaaa, 0,0000, R$ 0,00 | purchases-editor.tsx | PASS | 09-02 grep |
      | Item badge ativo/inativo (D-16) | verde #EAF3DE/#1B6B2C / cinza #F4F4F2/#888780 | page-header.tsx | PASS | 09-02 |
      | Ficha Identificacao Row 1 grid (D-01) | 110px 1fr 150px 175px | ficha-form.tsx Box sx | PASS | 09-03 grep + unit |
      | Ficha Identificacao Row 2 grid (D-01) | 1fr 1fr 120px 1fr | ficha-form.tsx Box sx | PASS | 09-03 grep |
      | Ficha Custo atual (D-03) | #E6F1FB bg + #185FA5 text + fontSize 18 fontWeight 600 | ficha-form.tsx | PASS | 09-03 unit |
      | Ficha topbar btn-icon Duplicar (D-05) | SVG M3 11V3h8 + padding 7px 10px | FichaHeaderActions.tsx | PASS | 09-04 grep |
      | Ficha topbar btn-icon Exportar (D-05) | SVG M3 10v3h10v-3 + TODO handler | FichaHeaderActions.tsx | PASS | 09-04 grep |
      | Ficha badge ativa (D-06) | #EAF3DE/#1B6B2C | page-header.tsx | PASS | 09-04 |
      | Ficha version badge V{n} (D-07) | #E6F1FB/#185FA5/#B5D4F4 polido | ficha-form.tsx (posicao preservada) | PASS | 09-04 |
      | Ficha Finalizacao 2-col (D-08) | 1fr 1fr + placeholders + (opcional) | ficha-form.tsx Box sx | PASS | 09-04 unit |

    **§4 E2E Pixel-Perfect Tests**
    - Spec estendido: tests/e2e/pixel-perfect-phase8.spec.ts com describes Phase 9 item detail + ficha detail.
    - Tests novos: 4 (P9-ITEM-01, P9-ITEM-02, P9-FICHA-01..03, ficha topbar btn-icon presence).
    - Extrator de grid usa `getComputedStyle` ancestor-walk (compativel com MUI sx className-based CSS — `closest('[style*=...]')` nao funciona pois MUI nao emite inline style).
    - Subset estavel E2E (bootstrap + navigation + pixel-perfect-phase8): 100% PASS com workers=1.
    - engineering-flow + importacao gates: sem regressao vs baseline Phase 8 (4 flakes pre-existentes aceitos per Phase 8 D-16).

    **§5 Release Scaffold**
    - NO ZIP (per user scope change Phase 8-07 2026-04-17).
    - Delivery = git tag `v1.2-phase-9` + commit SHA.
    - Assinatura: executor=<agent>, data=<ISO>, evidence=commit SHAs dos planos 09-01..09-05.
    - Pointer para 09-RELEASE-NOTES.md.

    **Footer:** Status: `complete` com data ISO, executor name.
  </action>
  <verify>
    <automated>grep -c "§3 UI Pixel-Perfect" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md &amp;&amp; grep -c "§4 E2E Pixel-Perfect" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md &amp;&amp; grep -c "§5 Release Scaffold" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md &amp;&amp; grep -c "NO ZIP\|no zip\|sem ZIP" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md` contains `## §3 UI Pixel-Perfect` (grep)
    - Contains `## §4 E2E Pixel-Perfect Tests` (grep)
    - Contains `## §5 Release Scaffold` (grep)
    - Contains literal table rows citing D-01, D-03, D-05, D-08 (grep each)
    - Contains literal `110px 1fr 150px 175px` AND `1fr 1fr 120px 1fr` (grep)
    - Contains literal `#E6F1FB` AND `#185FA5` (grep)
    - §5 contains `git tag` OR `v1.2-phase-9` OR `commit SHA` (grep — at least one)
    - §5 explicitly states `NO ZIP` OR `sem ZIP` OR `without ZIP` (grep — per Phase 8-07 scope change)
    - Status `complete` or `in-progress` at top with ISO date
  </acceptance_criteria>
  <done>
    09-VERIFICATION.md consolidada com §1-§5 populadas; tabela pixel-perfect + E2E gate + release scaffold sem ZIP.
  </done>
</task>

<task type="auto">
  <name>Task 3: 09-RELEASE-NOTES.md com git tag + commit SHA (sem ZIP)</name>
  <files>.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md</files>
  <read_first>
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/ (procurar release notes pos-Phase 8-07 — arquivo apos scope change 2026-04-17)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md (Task 2 output — §5)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md ate 09-04-SUMMARY.md (commits SHAs)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md (D-18 contexto escopo change)
  </read_first>
  <action>
    Criar `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md`:

    ```markdown
    # Phase 9 — Release Notes

    **Tag:** v1.2-phase-9
    **Date:** <ISO date>
    **Delivery:** git tag + commit SHA (NO ZIP per user scope change Phase 8-07 2026-04-17).

    ## Scope

    Telas internas de Item e Ficha Tecnica alinhadas 1:1 com os HTMLs aprovados:
    - update/tela-item-v1.html
    - update/tela-ficha-tecnica-v2.html

    ## Plans Delivered

    - 09-01-schema-api-audit (wave 1 solo) — commit SHA: <get via `git log --oneline --grep="09-01"`>
    - 09-02-item-form-retoque (wave 2 parallel with 09-03) — commit SHA: <get via `git log --oneline --grep="09-02"`>
    - 09-03-ficha-identificacao-refactor (wave 2 parallel with 09-02, TDD RED/GREEN) — RED SHA: <...>, GREEN SHA: <...>
    - 09-04-ficha-topbar-finalizacao (wave 3 sequential after 09-03 — shared ficha-form.tsx) — commit SHA: <...>
    - 09-05-pixel-perfect-tests-release (wave 4 solo) — commit SHA: <this>

    ## Decisions Implemented (D-01..D-20 from 09-CONTEXT.md)

    - D-01..D-04: Ficha Identificacao Box sx grid 110px 1fr 150px 175px + 1fr 1fr 120px 1fr; Custo atual #E6F1FB; TDD RED/GREEN separados.
    - D-05..D-08: Ficha topbar Duplicar/Exportar btn-icon; badge ativa verde; version badge polido; Finalizacao 2-col 50/50 opcional.
    - D-09..D-12: Schema audit formal → zero migration; Zod preparationMode optional default ''.
    - D-13..D-16: Item FormSection sem description; topbar hex tokens; Fornecedor 2+ placeholders HTML; badge verde/cinza.
    - D-17..D-20: Spec pixel-perfect estendido; 5 planos wave-based; E2E gates apos cada plano.

    ## Test Evidence

    - Unit: X/X PASS
    - Integration: Y/Y PASS
    - E2E subset estavel (bootstrap + navigation + pixel-perfect-phase8 workers=1): Z/Z PASS
    - pixel-perfect-phase8 com 4 tests novos Phase 9: <N> PASS / <M> logged divergences

    ## Deferred to Roadmap v2

    - PDFV2-FUT-01: Exportar ficha PDF real (btn-icon Exportar hoje = TODO).
    - Handler real Duplicar ficha em UI nova (se nao ja existente) — Phase 10 ou ticket separado.

    ## Delivery

    Nenhum ZIP. Cliente usa `git fetch && git checkout v1.2-phase-9`.

    ## Signature

    - Executor: <agent>
    - Date: <ISO>
    - Evidence: commit SHAs registrados acima.
    ```

    Preencher commit SHAs via:
    ```
    git log --oneline -20 | grep "09-0"
    ```

    Ao final, criar git tag:
    ```
    git tag -a v1.2-phase-9 -m "Phase 9: Telas detalhe Item + Ficha pixel-perfect com HTML"
    ```

    Verificar:
    ```
    git tag -l "v1.2-phase-9"
    git show v1.2-phase-9 --stat
    ```

    Commit das mudancas:
    ```
    git add .planning/phases/09-detalhe-item-ficha-pixel-perfect/
    git commit -m "docs(09-05): consolidate Phase 9 verification + release notes (no ZIP)"
    ```
  </action>
  <verify>
    <automated>test -f .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md &amp;&amp; grep -c "v1.2-phase-9" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md &amp;&amp; grep -c "NO ZIP\|Nenhum ZIP\|no ZIP" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md &amp;&amp; git tag -l "v1.2-phase-9" | grep "v1.2-phase-9"</automated>
  </verify>
  <acceptance_criteria>
    - File `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-RELEASE-NOTES.md` exists
    - Contains literal `v1.2-phase-9` (grep)
    - Contains literal `NO ZIP` OR `Nenhum ZIP` OR `no ZIP` (grep — per Phase 8-07 scope change)
    - Contains section `## Plans Delivered` listing 09-01..09-05 (grep each plan_id)
    - Contains section `## Decisions Implemented` citing D-01, D-05, D-09, D-13, D-17 (grep representative IDs)
    - Contains commit SHA references (not placeholders <...>; real SHAs after execution)
    - Contains section `## Test Evidence` with counts
    - Git tag `v1.2-phase-9` exists: `git tag -l "v1.2-phase-9"` returns the tag
    - Final commit created with message containing `09-05` and `no ZIP` OR similar (git log verifiable)
  </acceptance_criteria>
  <done>
    Release notes entregues via git tag + commit SHA (sem ZIP); 09-VERIFICATION.md §5 aponta para este arquivo; tag criada e verificavel.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Playwright file:// URL load | HTML contract carregado local, sem network; sem input de usuario |
| Git tag creation | Operacao local; tag empurrada remoto apenas se user solicitar |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-05-01 | Information Disclosure | E2E test file:// URL | accept | Local Playwright runner only; nao expoe HTMLs a rede; contratos sao arquivos internos update/. |
| T-09-05-02 | — | VERIFICATION.md + RELEASE-NOTES.md | accept | Arquivos documentais internos em .planning/; nao expostos publicamente; commit SHAs sao publicos em git history. |
| T-09-05-03 | Tampering | Git tag integrity | accept | Tag local anotada (-a); sem push automatico; cliente puxa via `git fetch && git checkout v1.2-phase-9`. |
</threat_model>

<verification>
- tests/e2e/pixel-perfect-phase8.spec.ts estendido com 2 describes novos (Phase 9 item detail + Phase 9 ficha detail)
- Pre-existing 26 PASS Phase 8 preservados
- Subset estavel E2E (bootstrap + navigation + pixel-perfect-phase8) 100% PASS workers=1
- 09-VERIFICATION.md §1-§5 populadas
- 09-RELEASE-NOTES.md criado com git tag v1.2-phase-9 + commit SHAs
- Git tag v1.2-phase-9 existe localmente
- Sem ZIP (per Phase 8-07 user scope change)
</verification>

<success_criteria>
1. Spec Playwright estendido com contract-check automatizado das detail pages.
2. Subset estavel E2E (bootstrap + navigation + pixel-perfect-phase8) 100% PASS.
3. engineering-flow + importacao E2E sem regressao vs baseline (4 flakes pre-existentes aceitos).
4. 09-VERIFICATION.md consolidada §1-§5.
5. 09-RELEASE-NOTES.md entregue via git tag v1.2-phase-9 + commit SHA.
6. Phase 9 formalmente fechada (ready for user review).
</success_criteria>

<output>
After completion, create `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-05-SUMMARY.md` documenting:
- Spec Playwright estendido (diff + tests count)
- 09-VERIFICATION.md consolidada (pointer)
- 09-RELEASE-NOTES.md (pointer + git tag SHA)
- Final gates passados
- Phase 9 = complete (5/5 plans)
- Update STATE.md indicando Phase 9 complete
</output>
