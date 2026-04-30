---
phase: 08-recuperacao-fidelidade-layout-e-modelo-fornecedor
plan: 03
subsystem: catalog-ui
tags: [catalog, ui, fornecedor, pixel-perfect, tdd, react-testing-library]

requires:
  - phase: 08-02-schema-migracao-import
    provides: Presenter mapPurchases derivando usageUnit/usageQuantity/usageIsFixedFromPrimary + Zod purchaseSchema D-08 + ItemCompra schema estendido
  - phase: 08-01-nan-null-guards
    provides: Guards NaN/null baseline no Quadro Final
provides:
  - PurchaseRow interface estendida com usageUnit + usageQuantity + usageIsFixedFromPrimary
  - UI pixel-perfect por fornecedor (HTML tela-item-v1.html linhas 227-362): 3 linhas de medidas por card
  - Badge "fixado do 1o fornecedor" inline nos labels Unidade/Qtde de uso dos secundarios
  - Derivacao client-side em tempo real: secundarios herdam usageUnit + usageQuantity do primaryRow no render
  - Fator de conversao readonly verde DENTRO de cada card (D-12), hint "Calculado automaticamente."
  - Preco de uso per fornecedor usando SEUS proprios purchaseCost/fator (D-07) — nao o fator do principal
  - Botao "Tornar principal" em secundarios -> reseta demais + Alert inline transitorio "Campos fixados atualizados a partir de {nome}" (D-06)
  - Botao Remover condicional a !isPrimary
  - R10 resolvida: card colors invertidas para bater HTML linha 98 (secundarios verdes, principal cinza neutro)
affects: [08-04-identificacao-enxuta, 08-06-grade-fallback]

tech-stack:
  added: []
  patterns:
    - "Client-side derivation by primary in render: find(r=>r.purchaseIsPrimary) fora do map; dentro do map displayUsageUnit = isPrimary ? row.usageUnit : primaryUsageUnit"
    - "Conditional readonly TextField rendering: principal edits via controlled select/number; secundario renderiza TextField readonly com slotProps + readonlyGreenSx compartilhado"
    - "Inline Badge dentro do label prop do TextField: label={<>Unidade de uso <FixadoBadge /></>} — MUI aceita ReactNode mantendo getByLabelText funcional porque o textContent concatena"
    - "Transient Alert via useState + setTimeout: setPrimarySwitchMessage(msg) + setTimeout(null, 3000) para feedback D-06 sem biblioteca de toasts"
    - "buildAdditionalRow separado de buildDefaultRow: novo fornecedor sempre entra como secundario com usageIsFixedFromPrimary=true (usageUnit/Qtde vazios e derivados no render)"

key-files:
  created:
    - src/tests/unit/catalog/purchases-editor.test.tsx (Task 1 RED, commit c36441e — criado por agente paralelo antes deste executor)
  modified:
    - src/modules/catalog/ui/purchases-editor.tsx
    - src/modules/catalog/ui/item-form.tsx
    - src/app/(app)/itens/[itemId]/page.tsx
    - src/tests/unit/item-form.test.tsx

key-decisions:
  - "D-05 client-side derivation: secundarios derivam usageUnit/usageQuantity no render (nao em state) — primaryRow calculado uma vez fora do .map e displayUsageUnit avaliado dentro do map. Mantem escrita principal-only (Phase 8-02) e UI sempre em sync com mudancas do principal sem onChange boilerplate"
  - "D-06 transient Alert via useState + setTimeout: feedback transitorio de 3s sem dependencia de toast lib; Alert aparece antes dos cards (nao por card) para uma unica confirmacao do toggle. window.setTimeout guardado com typeof window para SSR safety"
  - "D-07 precoUso por fornecedor dentro do map: cada card calcula seu proprio cost/fator com displayUsageQuantity herdado do principal — trivial de auditar e bate presenter mapPurchases linha 121 do mapper"
  - "D-11 preservar estrutura cards/borders/Stack/FormSection/hidden-input/Adicionar-button — zero regressao em item-form-schema.ts nem em readPurchasesFromFields. Mobile fallback (!desktop) tambem recebeu hidden inputs purchaseUsageUnit/purchaseUsageQuantity para que formData.getAll() funcione quando usuario submeta de mobile sem purchasesJson override"
  - "R10 cor verde — option-a (inverter): secundarios verdes (#F0F7E8 + #C0DD97) bate HTML update/tela-item-v1.html linha 98 `.fornecedor-block + .fornecedor-block { background: #F0F7E8; border-color: #C0DD97; }`; principal passa a neutro (#FAFAF9 + divider). Decisao do usuario: strict HTML fidelity e o goal da Phase 8 (recuperacao de confianca apos rejeicao do cliente)"
  - "Label principal rename: `purchaseQuantityPrompt` trocou `Qtde compra` por `Quantidade de compra` para bater HTML linha 266. Test legado item-form.test.tsx linha 57 atualizado de mesma forma (Rule 1 regression fix causado pela mudanca de label, NAO pre-existente)"
  - "Add fornecedor via buildAdditionalRow: novo fornecedor entra como secundario (purchaseIsPrimary=false) com usageUnit=\"\", usageQuantity=\"\", usageIsFixedFromPrimary=true — deixa o render client-side derivar do principal imediatamente, sem exigir input do usuario para campos que serao descartados no DB (8-02 principal-only)"

requirements-completed: [SPEC-ITEM-FORNECEDOR]

metrics:
  duration: ~1h (executor continuation apos checkpoint Task 1.5)
  tasks_completed: 2 (Task 1 RED via agente paralelo + Task 2 GREEN neste executor)
  files_touched: 4
  atomic_commits: 1 (feat 08-03 GREEN; RED c36441e ja presente via agente anterior)
  unit_tests: "150/150 GREEN (inclui 9 novos purchases-editor.test.tsx)"
  typecheck: "clean (apos prune de .next/types/app/dev-preview stale)"

started: 2026-04-17T20:00:00Z
completed: 2026-04-17T20:10:00Z
---

# Phase 8 Plan 03: UI Fornecedor Bloco 2 Summary

**Purchases editor estendido com Unidade/Qtde de uso por fornecedor, badge "fixado do 1o fornecedor" nos secundarios, derivacao client-side em tempo real, toggle principal com aviso inline, fator e preco de uso por fornecedor — tudo bate pixel-perfect com HTML tela-item-v1.html linhas 227-362.**

## Performance

- **Duration:** ~1h (executor continuation; Task 1 RED foi commit c36441e por agente paralelo anterior)
- **Started (this executor):** 2026-04-17T20:00:00Z
- **Completed:** 2026-04-17T20:10:00Z
- **Tasks:** 2 efetivas (Task 1 RED + Task 2 GREEN) com gate Task 1.5 resolvida pelo usuario (option-a)
- **Files modified:** 4
- **Commits atomicos:** 1 (novo feat GREEN neste executor; RED ja existia)

## Accomplishments

- `PurchaseRow` interface estendida com `usageUnit: string`, `usageQuantity: string`, `usageIsFixedFromPrimary: boolean` — contrato alinhado ao que mapPurchases ja emite desde Phase 8-02
- Layout por card 100% HTML-fiel: 3 linhas de medidas (Unidade compra | Unidade uso), (Qtde compra | Qtde uso | Fator), (Preco compra | Preco uso | vazio)
- `FixadoBadge` inline component replicando HTML linha 110 (fontSize 10, bg #EAF3DE, color #1B6B2C, border 0.5px solid #C0DD97) dentro dos labels Unidade/Qtde de uso dos secundarios
- Principal: `Unidade de uso` vira MUI `<TextField select>` editavel; `Quantidade de uso` vira `<TextField type="number">` editavel; ambos com `name="purchaseUsageUnit"` / `name="purchaseUsageQuantity"` para compatibilidade com `readPurchasesFromFields` do item-form-schema
- Secundarios: `Unidade de uso` + `Qtde de uso` renderizam TextField com `slotProps.input.readOnly=true`, `aria-readonly="true"`, `readonlyGreenSx` compartilhado (bg #EAF3DE, color #1B6B2C), e hidden inputs acompanham para serializacao
- `primaryRow = rows.find((r) => r.purchaseIsPrimary)` calculado uma vez fora do map; dentro de cada card `displayUsageUnit = isPrimary ? row.usageUnit : primaryUsageUnit` — derivacao real-time sem onChange boilerplate
- Fator de conversao DENTRO de cada card (D-12) como readonly verde com `helperText="Calculado automaticamente."`
- Preco de uso por fornecedor (D-07): `precoUso = row.purchaseCost / (row.purchaseQuantity / displayUsageQuantity)` — usa os proprios valores do card, nao o fator do principal
- Botao "Tornar principal" (MUI Button text #185FA5 ~ `.add-btn`) aparece APENAS em secundarios; ao clicar chama `handleTogglePrimary(index)` que reseta `purchaseIsPrimary` de todos para index-match e dispara Alert inline transitorio `Campos fixados atualizados a partir de {nome}` com timeout de 3s (D-06)
- Botao Remover (IconButton DeleteOutline) preservado APENAS em secundarios — principal nao pode ser removido (constraint D-11)
- Botao Adicionar fornecedor agora chama `buildAdditionalRow(purchaseUnit)` que emite `purchaseIsPrimary: false, usageUnit: "", usageQuantity: "", usageIsFixedFromPrimary: true` — secundario puro derivado do principal
- **R10 cor verde resolvida (Task 1.5 → option-a):** cards secundarios agora `bgcolor: "#F0F7E8"` + `borderColor: "#C0DD97"`; principal `bgcolor: "#FAFAF9"` + `borderColor: "divider"`. Label overline do principal volta a `text.secondary` (sem verde). Bate HTML linha 98
- Consumer `src/app/(app)/itens/[itemId]/page.tsx` atualizado para passar `purchase.usageUnit / usageQuantity / usageIsFixedFromPrimary` do presenter (mapPurchases ja emite desde Phase 8-02)
- Default primaryPurchase fallback em item-form.tsx estendido com os 3 campos novos
- Mobile fallback (`!desktop`) recebeu hidden inputs `purchaseUsageUnit` + `purchaseUsageQuantity` para preservar formData contract em dispositivos pequenos

## Task Commits

1. **Task 1 RED** (via agente paralelo antes deste executor): `c36441e` test(08-03): add failing RED tests for purchases-editor (D-05/D-06/D-07/D-08/D-11) — 9 it() cobrindo badge, derivacao, aria-readonly, D-07 price math, toggle principal, add fornecedor, fator derivation
2. **Task 1.5 Decision** (checkpoint:decision resolvida pelo usuario): option-a escolhida — inverter cor dos cards para bater HTML update/tela-item-v1.html linha 98. Rationale: strict HTML fidelity e o goal da Phase 8 (recuperacao de confianca apos rejeicao do cliente)
3. **Task 2 GREEN** (este executor): `3591740` feat(08-03): extend purchases-editor with per-fornecedor Unidade/Qtde de uso, badge fixado, derivacao client-side, toggle principal (D-05/D-06/D-07/D-08/D-11)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] TypeScript error em itens/[itemId]/page.tsx apos extensao do PurchaseRow**

- **Found during:** Task 2 typecheck pos-commit
- **Issue:** `src/app/(app)/itens/[itemId]/page.tsx` linha 96 passava purchases sem os novos campos (`usageUnit`, `usageQuantity`, `usageIsFixedFromPrimary`), quebrando typecheck porque a interface foi estendida
- **Fix:** Adicionados 3 campos no `.map()` consumindo os valores que `mapPurchases` (Phase 8-02 commit 2d5049b) ja emite: `usageUnit: purchase.usageUnit ?? ""`, `usageQuantity: purchase.usageQuantity ?? ""`, `usageIsFixedFromPrimary: purchase.usageIsFixedFromPrimary ?? !purchase.purchaseIsPrimary`
- **Files modified:** src/app/(app)/itens/[itemId]/page.tsx
- **Commit:** 3591740

**2. [Rule 1 — Bug] Test legado item-form.test.tsx assertiu "qtde compra" mas HTML manda "Quantidade de compra"**

- **Found during:** Task 2 full unit run
- **Issue:** Label `purchaseQuantityPrompt` trocou de "Qtde compra" (legado pre-Phase 8) para "Quantidade de compra" (HTML linha 266 pixel-perfect). Test `src/tests/unit/item-form.test.tsx:57` (`expect(screen.getByText(/qtde compra/i))`) regrediu
- **Root cause:** Rename de label caused by this task (pixel-perfect contract); NAO pre-existente
- **Fix:** Regex atualizada para `/quantidade de compra/i`. Test purchases existente tambem estendido com os 3 campos novos do PurchaseRow para satisfazer typecheck em `initialValues.purchases`
- **Files modified:** src/tests/unit/item-form.test.tsx
- **Commit:** 3591740

**3. [Rule 3 — Blocking] .next/types/app/dev-preview/ficha/page.ts stale**

- **Found during:** Task 2 typecheck
- **Issue:** `.next/types/app/dev-preview/ficha/page.ts` linhas 2+5 importavam `src/app/dev-preview/ficha/page.js` — arquivo inexistente (pasta foi removida em phase anterior). Stale artifact de dev server rodado em checkout anterior; NAO causado por esta task
- **Fix:** `rm -rf .next/types/app/dev-preview`; typecheck clean apos prune
- **Files modified:** (artifacts; nao comittados)
- **Commit:** N/A (arquivos ignorados via `.next/**` no gitignore)

### Auth Gates
N/A — sem operacoes auth.

## Known Stubs
None. Derivacao client-side real-time em todos os cards secundarios; fator e precoUso calculados por fornecedor com math real; toggle principal muda state imediatamente.

## Threat Flags
None. Task pure UI refactor sobre perimetro auth existente (catalog-actions.ts). Readonly UI e conveniencia; server Zod + repository ja aplicam principal-only write constraint desde Phase 8-02.

## Verification Evidence

- `npm run test:unit` -> 150/150 GREEN (53 test files); inclui 9 em `src/tests/unit/catalog/purchases-editor.test.tsx` cobrindo D-05, D-06, D-07, D-08, D-11
- `npm run typecheck` -> exit 0 apos prune de `.next/types/app/dev-preview` stale (nao relacionado a este plano)
- Grep acceptance: `fixado do 1`=3, `Campos fixados atualizados`=1, `Calculado automaticamente`=1, `Calculado a partir da compra`=1, `primaryRow`=3, `usageQuantity`=8 (todos >= threshold do plano)
- `item-form.test.tsx` -> 1/1 GREEN (regressao fixada inline apos rename pixel-perfect)
- E2E `engineering-flow` -> deferido (Docker daemon off neste ambiente; spec nao toca purchases-editor diretamente)

## Self-Check: PASSED

- `src/modules/catalog/ui/purchases-editor.tsx`: FOUND (modificado)
- `src/modules/catalog/ui/item-form.tsx`: FOUND (modificado)
- `src/app/(app)/itens/[itemId]/page.tsx`: FOUND (modificado)
- `src/tests/unit/item-form.test.tsx`: FOUND (modificado)
- `src/tests/unit/catalog/purchases-editor.test.tsx`: FOUND (criado em commit anterior c36441e)
- Commit `c36441e` (RED): FOUND
- Commit `3591740` (GREEN): FOUND
- All acceptance grep counts satisfied (>= plan thresholds)
- 150/150 unit tests pass
- typecheck exit 0
