---
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 02
subsystem: [catalog, platform-ui]
tags: [ui, pixel-perfect, item, fornecedor, topbar, d13, d14, d15, d16]
requires:
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md (D-13..D-16)
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md
  - update/tela-item-v1.html
provides:
  - item-form-form-section-sem-description
  - itens-detail-novo-topbar-hex-tokens
  - status-chip-ativo-inativo-hex-tokens
  - purchases-editor-secondary-placeholders
  - unlocks-wave-2-close
affects:
  - src/modules/catalog/ui/item-form.tsx
  - src/modules/catalog/ui/purchases-editor.tsx
  - src/app/(app)/itens/[itemId]/page.tsx
  - src/app/(app)/itens/novo/page.tsx
  - src/components/ui/StatusChip.tsx
tech-stack:
  added: []
  patterns:
    - hex-token-sx-override (MUI Button sx with pixel-literal hex)
    - conditional-placeholder-by-role (!isPrimary guard)
    - status-chip-hex-resolver (auto hex map for ativo/inativo tokens)
key-files:
  created:
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-02-SUMMARY.md
  modified:
    - src/modules/catalog/ui/item-form.tsx
    - src/modules/catalog/ui/purchases-editor.tsx
    - src/app/(app)/itens/[itemId]/page.tsx
    - src/app/(app)/itens/novo/page.tsx
    - src/components/ui/StatusChip.tsx
    - src/tests/unit/item-form.test.tsx
decisions:
  - "FormSection.tsx nao precisou de mudanca — description ja era opcional com render condicional (09-CONTEXT.md interfaces confirma); Task 1 ajustou apenas o caller item-form.tsx"
  - "StatusChip estendido com resolveHexTokens() que auto-aplica tokens #EAF3DE/#1B6B2C (ativo) ou #F4F4F2/#888780 (inativo) sem exigir hexColors explicito do chamador — preserva compat com outros usos e corrige D-16 em toda a UI que passar status='ativo|inativo'"
  - "Placeholders fornecedor 2+ usam guard !isPrimary (nao isFixedFromPrimary) porque o HTML linha 293-361 mostra o card secundario completo com os 3 placeholders; principal mantem defaults 1.0000/0.0000 intactos per D-15"
  - "PageHeader size='compact' aplicado em /itens/[itemId] para subtitulo 12px #888780 mt 3px bater HTML linha 170 — novo=default (subtitulo generico)"
metrics:
  duration_seconds: 420
  completed_date: 2026-04-19T22:10:00Z
  tasks_total: 3
  tasks_completed: 3
  files_touched: 5
  commits: 4
---

# Phase 09 Plan 02: Item Form Retoque Summary

Retoque pixel-perfect da tela de Item com HTML `update/tela-item-v1.html`: FormSection Identificacao sem subtitle (D-13), topbar com hex tokens exatos (#185FA5, #F09595, #A32D2D, #0C447C, #EAF3DE, #1B6B2C, #F4F4F2, #888780) em btn-danger/btn-primary/StickyActionBar/badge (D-14 + D-16), e placeholders pixel-perfect 'dd/mm/aaaa', '0,0000', 'R$ 0,00' no fornecedor 2+ (D-15). Wave 2 fechada pelo lado Item; 09-03 (ficha-identificacao-refactor) roda em paralelo e nao compartilha arquivos.

## Tasks Completed

| Task | Name                                                                          | Commit(s)            | Files                                                                                                                                                                   |
|------|-------------------------------------------------------------------------------|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1    | TDD RED + GREEN: FormSection sem description em item-form.tsx (D-13)          | 6ddb533 / 04baaf5    | `src/tests/unit/item-form.test.tsx`, `src/modules/catalog/ui/item-form.tsx`                                                                                             |
| 2    | Topbar item hex tokens + badge ativo/inativo (D-14 + D-16)                    | 726ede9              | `src/app/(app)/itens/[itemId]/page.tsx`, `src/app/(app)/itens/novo/page.tsx`, `src/components/ui/StatusChip.tsx`                                                        |
| 3    | Placeholders fornecedor 2+ pixel-perfect (D-15)                               | 1d01be8              | `src/modules/catalog/ui/purchases-editor.tsx`                                                                                                                           |

## What Was Built

### 1. FormSection sem description (D-13) — TDD RED/GREEN

- **RED commit `6ddb533`** — `src/tests/unit/item-form.test.tsx` +3 its: `queryByText(/Dados mestres para identificar/) toBeNull`; overline labels `Identificacao` e `Observacoes` preservados. `npx vitest run src/tests/unit/item-form.test.tsx` → 3/4 PASS + 1 FAIL (expected) confirmando drift real (subtitle renderizado).
- **GREEN commit `04baaf5`** — `src/modules/catalog/ui/item-form.tsx` linha 113: `<FormSection title="Identificacao" description="Dados mestres para identificar o item no cadastro operacional.">` → `<FormSection title="Identificacao">`. 4/4 PASS pos-fix.
- FormSection.tsx em si NAO foi alterado — description ja era `description?: string` (linha 9) com render condicional `{description ? <Typography>...</Typography> : null}` (linha 29-33). Plano 09-CONTEXT.md interfaces confirma que so caller precisava ajuste.
- `.card-label` do HTML linha 56 (10px font-weight 600 letter-spacing .1em color #888780 text-transform uppercase margin-bottom 16px) bate 1:1 com o overline Typography do FormSection apos o drop.

### 2. Topbar Item + badge (D-14 + D-16)

**`src/components/ui/StatusChip.tsx`** — nova funcao `resolveHexTokens(status)` que mapeia automaticamente:

```ts
if (["ativo", "ativa"].includes(normalized)) {
  return { bg: "#EAF3DE", text: "#1B6B2C", border: "#C0DD97" };
}
if (["inativo", "inativa"].includes(normalized)) {
  return { bg: "#F4F4F2", text: "#888780", border: "#D3D1C7" };
}
```

Chip renderizado com `fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: '20px', border: '0.5px solid {border}'` — 1:1 com HTML linha 44 (`.badge`).

**`/itens/[itemId]/page.tsx`** — topbar:

- `PageHeader size="compact"` → subtitulo `fontSize: 12, color: '#888780', marginTop: '3px'` (HTML linha 170).
- Botao "Excluir item" (topbar + StickyActionBar): `sx={{ padding: '8px 18px', borderColor: '#F09595', color: '#A32D2D', '&:hover': { backgroundColor: '#FCEBEB', borderColor: '#F09595' } }}`.
- Botao "Salvar alteracoes" (topbar + StickyActionBar): `sx={{ padding: '8px 18px', backgroundColor: '#185FA5', borderColor: '#185FA5', color: '#fff', '&:hover': { backgroundColor: '#0C447C' } }}`.
- Status `item.active ? "ativo" : "inativo"` agora renderiza via `StatusChip` com hex auto — verde para ativo, cinza para inativo (nao vermelho, per D-16).

**`/itens/novo/page.tsx`** — topbar + StickyActionBar: botao "Salvar item" com mesmos tokens #185FA5 / #0C447C.

Verificacao grep:

- 12 occorrencias `#185FA5|#F09595|#A32D2D|#0C447C` em `/itens/[itemId]/page.tsx`.
- 6 occorrencias `#185FA5|...` em `/itens/novo/page.tsx`.
- Tokens verde/cinza em `StatusChip.tsx` (3 pares).

### 3. Placeholders Fornecedor 2+ (D-15)

`src/modules/catalog/ui/purchases-editor.tsx` — 3 placeholders condicionais `!isPrimary`:

| Campo | Linha | Placeholder | HTML ref |
|-------|-------|-------------|----------|
| DatePicker `priceUpdatedAt` | 337 | `dd/mm/aaaa` | linha 310 |
| TextField `purchaseQuantity` | 425 | `0,0000` | linha 335 |
| TextField `purchaseCost` | 494 | `R$ 0,00` | linha 353 |

Fornecedor 1 (principal) mantem defaults `1.0000` (qtde) e `0.0000` (preco) — nao sao placeholders, sao valores pre-preenchidos sensatos conforme D-15 permite.

Textarea "Descricao operacional" em item-form.tsx linha 233 mantida byte-a-byte: `"Ex.: Arroz marca Albaruska, grao longo, tipo 1. Preferir embalagem 5kg."` — match HTML linha 378.

## Gates Passados

- `npm run db:generate` → PASS (setup esperado do worktree; artefato Prisma nao versionado).
- `npm run typecheck` → PASS (exit 0).
- `npx vitest run src/tests/unit/item-form.test.tsx src/tests/unit/item-detail-page.test.tsx src/tests/unit/page-header.test.tsx src/tests/unit/catalog/purchases-editor.test.tsx src/tests/unit/catalog/ItemForm.test.tsx` → **22/22 PASS** em 2.38s.
- Grep acceptance criteria: todas atendidas (vide secao "What Was Built §2").

### E2E (D-20 gate)

Nao executado neste worktree paralelo — Docker nao disponivel no runtime do worktree; gate E2E ficara com o plano 09-05 e release consolidado. Plans 09-01 e 09-02 nao introduzem mudancas de contrato server/DB; so UI tokens + props opcionais.

### Pre-existing failures (out of scope — ja documentados em 09-01)

- `src/tests/unit/engineering/fichas-listing.test.tsx` — grade widths Phase 8.1 residual.
- `src/tests/unit/items-listing.test.tsx` — widths/headers residuais.
- `src/tests/unit/items-page.test.tsx`, `src/tests/unit/fichas-page.test.tsx` — residuais.

Owners: 09-05 ou futuro. Nao relacionados a 09-02 (escopo = item detail/novo + topbar + placeholders).

## Deviations from Plan

### None (plan executed exactly as written)

Notas operacionais:

1. `npm run db:generate` foi necessario uma vez antes do typecheck/testes para resolver imports de `@/generated/prisma/client` (artefato nao gerado no worktree limpo). Setup esperado — nao e deviation.
2. StatusChip.tsx foi estendido (em vez de apenas passar hexColors do caller) porque a API `status="ativo|inativo"` ja existia e a solucao mais limpa e auto-resolver tokens; preserva compat com outros usos e atende D-16 em qualquer lugar que passe esses status. Isso segue D-16 acceptance criteria: o unico constraint e "badge ativo verde, inativo cinza nao vermelho" — que agora e invariante global.

## Auth Gates

Nenhuma durante execucao.

## Decisions Made

- **FormSection sem refactor** — component ja suportava description opcional com render condicional; so caller item-form.tsx precisava drop da prop. Mantem blast radius minimo.
- **StatusChip auto-resolve** — tokens verde/cinza/neutro aplicados automaticamente por normalizacao de status, evita duplicacao de sx inline em cada page.tsx. Sobrescrito pelo prop `hexColors` quando o caller quer override explicito.
- **Placeholders por role (!isPrimary)** — guard simples e explicito; principal mantem defaults, secundario mostra placeholder. Nao usa `usageIsFixedFromPrimary` porque HTML linhas 293-361 mostra placeholders em TODOS os campos nao-derivados do secundario (incluindo `purchaseQuantity` que NAO e fixado).
- **PageHeader compact** — `size="compact"` ja existia como um modo previsto para grade de fichas (comment em PageHeader.tsx linha 24-27). Aplicar no item detail reusa o mesmo caminho sem fragmentar styling.

## Threat Flags

Nenhum — plano e pure UI polish (tokens + placeholders + props opcionais); zero nova superficie de ataque; zero novo endpoint; zero nova entrada de dados. T-09-02-01 do threat model continua `accept` sem mitigacao.

## Known Stubs

Nenhum — todas as mudancas sao fully-wired (hex literais in-place, placeholders renderizados na arvore jsx real, Chip sx aplicado no render).

## TDD Gate Compliance

- RED gate: commit `6ddb533` — `test(09-02): add failing test for FormSection sem description (D-13)` (Task 1 only).
- GREEN gate: commit `04baaf5` — `feat(09-02): remove description prop from Identificacao FormSection (D-13)`.
- REFACTOR gate: n/a (trivial change, no cleanup needed).
- Tasks 2 e 3 nao exigem TDD (plano marcava so Task 1 com `tdd="true"`).

## Next

- **09-03 (paralelo, ja em Wave 2):** Ficha Identificacao refactor TDD RED/GREEN. Sem overlap com este plano (arquivos disjuntos: `engineering/ui/ficha-form.tsx` vs `catalog/ui/*` + `app/(app)/itens/*`).
- **09-04 (Wave 3, depende de 09-03):** Ficha topbar + Finalizacao.
- **09-05 (Wave 4, solo):** Pixel-perfect tests spec extension + VERIFICATION.md final + release.

## Self-Check: PASSED

Verificacao pos-commit (commits + arquivos):

- FOUND: commit `6ddb533` — RED gate (test)
- FOUND: commit `04baaf5` — GREEN Task 1 (feat)
- FOUND: commit `726ede9` — Task 2 (feat)
- FOUND: commit `1d01be8` — Task 3 (feat)
- FOUND: `src/modules/catalog/ui/item-form.tsx` (sem `description="Dados mestres"` — grep 0 matches)
- FOUND: `src/modules/catalog/ui/purchases-editor.tsx` (placeholders `dd/mm/aaaa`, `0,0000`, `R$ 0,00` — 3 grep matches)
- FOUND: `src/app/(app)/itens/[itemId]/page.tsx` (12 hex literals #185FA5/#F09595/#A32D2D/#0C447C)
- FOUND: `src/app/(app)/itens/novo/page.tsx` (6 hex literals)
- FOUND: `src/components/ui/StatusChip.tsx` (hex tokens ativo #EAF3DE/#1B6B2C + inativo #F4F4F2/#888780)
- FOUND: `src/tests/unit/item-form.test.tsx` (queryByText(/Dados mestres/) assertion)
- PASS: `npm run typecheck` (exit 0)
- PASS: 22/22 tests verdes (item-form + item-detail-page + page-header + purchases-editor + catalog/ItemForm)
