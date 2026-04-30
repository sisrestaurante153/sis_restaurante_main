---
slug: v3-removed-grade-aligned
created: 2026-04-20
source: cliente mensagem 2026-04-20 21:15 (print com areas em roxo)
type: quick
---

# V3 badge removido + Grade Estrutura da Ficha alinhada

Dois micro-ajustes apos o cliente revisar o commit 05ac595.

## Mudancas

### 1. Remocao do badge "V3"

- Arquivo: `src/modules/engineering/ui/ficha-form.tsx`
- Removidas as linhas 297-318 (Box com `V{initialValues.version}`)
- Bloco `Data ultima alteracao` volta a ser um ReadonlyTextField solo, sem
  o Box wrapper que segurava o badge

### 2. Alinhamento da grade Estrutura da Ficha

- Arquivo: `src/modules/engineering/ui/FichaFlatGrid.tsx`
- `GRID_TEMPLATE` ajustado: coluna Unidade 60px -> 80px (label "Unidade" truncava
  para "Unid..." no MUI TextField por falta de espaco). Diferenca +20px absorvida
  pela coluna Item (1fr).
- Header "Etapa" transformado em nested grid 1fr 1fr com sub-headers "Etapa" | "Peso"
  — alinha 1:1 com os dois inputs (Tipo de etapa + Peso Pos-coccao) dentro da celula.
- Header "Qtde usada" agora eh left-aligned (antes era textAlign: right), alinhando
  com o label "Qtde" flutuante do TextField.

### 3. Testes atualizados

- `src/tests/unit/engineering/FichaFlatGrid.test.tsx` — contrato do GRID_TEMPLATE
  atualizado de `60px` para `80px` (com comentario explicando).
- `tests/e2e/pixel-perfect-phase8.spec.ts` — mesma atualizacao.

## Verificacao

- `tsc --noEmit` limpo
- `vitest run src/tests/unit/engineering/FichaFlatGrid.test.tsx` — 2/2 passa
- Demais falhas em `fichas-listing.test.tsx` sao pre-existentes (confirmado com git stash)
- Smoke visual: `node scripts/capture-ficha-edit.mjs` — prints salvos em
  `prints-cliente/ressalvas-v4/06a-identificacao-sem-v3.png` (V3 ausente) e
  `prints-cliente/ressalvas-v4/06b-grade-estrutura.png` (headers alinhados).

## Fora de escopo

- Demais falhas de pixel-perfect em `fichas-listing.test.tsx` (pre-existentes,
  nao relacionadas a essa ressalva)
- Demais ajustes de layout em outros componentes
