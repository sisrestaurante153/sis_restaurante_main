---
phase: 8
slug: recuperacao-fidelidade-layout-e-modelo-fornecedor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 8 — Validation Strategy

> Per-phase validation contract. Expanded from 08-RESEARCH.md §10 Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 3.2.4 (unit + integration) + Playwright 1.55 (e2e) |
| **Config files** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run typecheck && npm run test:unit` |
| **Full suite command** | `npm run test` |
| **Migration command** | `docker compose run --rm migrate` (D-04 canonical) |
| **Estimated quick runtime** | ~60 seconds |
| **Estimated full runtime** | ~5–7 minutes (unit + integration + e2e) |

---

## Sampling Rate

- **After every task commit:** `npm run typecheck && npm run test:unit`
- **After every plan wave:** `npm run test:unit && npm run test:integration`
- **After schema plan (D-04):** `docker compose run --rm migrate` twice to confirm idempotence
- **Before ZIP packaging (phase gate):** Full suite + pixel-perfect checklists + regression of 18 pendencias-v3 items
- **Max feedback latency per task:** 60 seconds

---

## Per-Task Verification Map

> Task IDs will be assigned by the planner. Columns: plan/wave/req map to plans 08-01..08-07 per D-19.

| Req ID | Behavior | Plan | Wave | Test Type | Automated Command | File Exists | Status |
|--------|----------|------|------|-----------|-------------------|-------------|--------|
| PDFV2-CRIT-03 | Venda de referencia nunca renderiza `R$ NaN` | 08-01 | 1 | unit | `npm run test:unit -- TotaisIndicadores` | ❌ W0 | ⬜ pending |
| PDFV2-CRIT-04 | `SESSION_SECRET` ausente → throw sem fallback hardcoded | 08-01 | 1 | unit | `npm run test:unit -- env` | ⚠ confirmar | ⬜ pending |
| PDFV2-CRIT-05 | CMV total "Calcular peso" quando `postCookingWeight` invalido | 08-01 | 1 | unit | `npm run test:unit -- TotaisIndicadores` | ❌ W0 | ⬜ pending |
| PDFV2-CRIT-06 | Margem "Informe o valor" quando `salePriceInput` invalido | 08-01 | 1 | unit | `npm run test:unit -- TotaisIndicadores` | ❌ W0 | ⬜ pending |
| PDFV2-CRIT-07 | CMV da marmita sem divisao invalida | 08-01 | 1 | unit | `npm run test:unit -- TotaisIndicadores` | ❌ W0 | ⬜ pending |
| SPEC-ITEM-FORNECEDOR | Save 2 fornecedores preserva `unidadeUso` derivado no read | 08-02/03 | 2 | integration | `npm run test:integration -- catalog-repository-fornecedor` | ❌ W0 | ⬜ pending |
| D-04 migration idempotence | Rodar migration 2x produz mesmo estado | 08-02 | 2 | integration | `npm run test:integration -- migration-idempotence` | ❌ W0 | ⬜ pending |
| D-05 presenter derivation | Secundario sem `unidadeUso` → read retorna do principal | 08-02/03 | 2 | integration | `npm run test:integration -- catalog-presenter` | ❌ W0 | ⬜ pending |
| D-06 troca de principal | Toggle principal reassigna readonly nos secundarios | 08-03 | 3 | unit (RTL) | `npm run test:unit -- purchases-editor` | ❌ W0 | ⬜ pending |
| D-17 Import CSV → ItemCompra principal | Linha importada cria `principal=true` com `unidade_uso_id` + `quantidade_uso=1` | 08-02 | 2 | e2e | `npm run test:e2e -- importacao` | ⚠ estender | ⬜ pending |
| SPEC-ITEM-LAYOUT | item-form renderiza Identificacao sem unidade/qtde/preco soltos | 08-04 | 3 | unit (RTL) | `npm run test:unit -- ItemForm` | ❌ W0 | ⬜ pending |
| PDFV2-FICHA-07 | Banner "ingrediente ja aparece em ficha semelhante" aparece ao adicionar componente duplicado | 08-05 | 3 | e2e | `npm run test:e2e -- engineering-flow` | ⚠ estender | ⬜ pending |
| SPEC-FICHA-FIDELIDADE | FichaFlatGrid grid-template-columns bate HTML aprovado + Coccao Final + botao etapa final | 08-05 | 3 | unit + manual | `npm run test:unit -- FichaFlatGrid` + checklist | ⚠ confirmar | ⬜ pending |
| SPEC-4-TELAS-ESTRITO | Pixel-perfect checklist (larguras, cores hex, paddings, font-weights) por tela | 08-07 | 4 | manual-only | — (VERIFICATION.md checklists) | — | ⬜ pending |
| PDFV2-ITEM-05 | Cards laterais removidos conforme HTML | 08-04 | 3 | unit (RTL) | `npm run test:unit -- ItemForm` | ❌ W0 | ⬜ pending |
| 18 itens pendencias-v3 regressao | Nenhuma regressao visual/funcional | 08-07 | 4 | e2e + manual | `npm run test:e2e -- engineering-flow` + checklist | ✓ existe | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

Criar antes do Wave 1 (fase de test infrastructure, plano 08-00 ou parte do 08-01):

- [ ] `src/tests/unit/engineering/TotaisIndicadores.test.tsx` — stubs para PDFV2-CRIT-03, 05, 06, 07
- [ ] `src/tests/unit/platform/env.test.ts` — stub para PDFV2-CRIT-04 (verificar se ja existe; criar se ausente)
- [ ] `src/tests/unit/catalog/ItemForm.test.tsx` — stub para SPEC-ITEM-LAYOUT + PDFV2-ITEM-05
- [ ] `src/tests/unit/catalog/purchases-editor.test.tsx` — stubs para D-06, D-08 (validacao multiplos fornecedores)
- [ ] `src/tests/integration/catalog/catalog-repository-fornecedor.test.ts` — SPEC-ITEM-FORNECEDOR + D-05 + D-07 + D-08 (save+read roundtrip com 1/2/N fornecedores)
- [ ] `src/tests/integration/catalog/catalog-presenter-derivation.test.ts` — D-05 derivation (secundario le do principal)
- [ ] `src/tests/integration/prisma/migration-idempotence.test.ts` — D-04 (migration 2x via docker compose)
- [ ] `tests/e2e/engineering-flow.spec.ts` — estender para PDFV2-FICHA-07 (banner ingrediente similar)
- [ ] `tests/e2e/importacao.spec.ts` — estender para D-17 roundtrip

**Framework install:** nenhum. Vitest + Playwright + Prisma ja instalados (ver package.json).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel-perfect das 4 telas contra HTML aprovado | SPEC-4-TELAS-ESTRITO, D-15 | Sem visual regression setup (deferido); contrato pixel-perfect requer olho humano + hex exatos | Para cada HTML em `update/`: abrir HTML e app lado-a-lado, percorrer checklist de larguras/cores/paddings/font-weights do `VERIFICATION.md`, capturar screenshot comparativo para release notes |
| Validacao lado-a-lado com cliente (sign-off do ZIP) | ROADMAP Phase 8 §4 | Aprovacao do cliente e externa; feita async via ZIP + release notes | Gerar `docs/qa/2026-04-17-recuperacao-cliente.md` com 4 screenshots comparativos, empacotar ZIP, enviar, aguardar aprovacao escrita |
| Regressao das 18 entregas pendencias-v3 | D-16 | Alguns itens sao puramente visuais (LinearProgress 6px, cores coloridas FC/IC, paddings) — checar no navegador depois do E2E | Checklist explicito em VERIFICATION.md, percorrer cada item do `20260417-pendencias-v3/SUMMARY.md` §Entregas |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (NaN guards, schema, presenter, UI fornecedor, item form, ficha, import todos tem automacao)
- [ ] Wave 0 criado e verde antes de Wave 1 (all ❌ W0 entries above)
- [ ] No watch-mode flags nos comandos listados
- [ ] Feedback latency < 60s (quick) / < 7min (full)
- [ ] `nyquist_compliant: true` set in frontmatter apos Wave 0 completo

**Approval:** pending
