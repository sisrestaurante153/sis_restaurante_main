---
phase: 07-correcao-pdf-v2
plan: 04
subsystem: engineering
tags: [ficha, header, listing, display-name, vitest, prisma, pdf-v2, fc, ic, nome-exibicao]

requires:
  - phase: 07-correcao-pdf-v2
    provides: "Guardas numericas e contrato expandido de item (07-01, 07-02)"
provides:
  - "Nome livre da ficha (nomeExibicao) com ancora canonica preservada no item mestre"
  - "Cabecalho revisado com Peso Final, Fator de Correcao e Indice de Coccao na ordem e nomenclatura corretas"
  - "Listagem de fichas expandida com 12 colunas operacionais: Codigo, Produto, Versao, Modalidade, Grupo Operacional, Status, Componentes, FC, IC, Custo Total, Ultima Atualizacao, Icone Observacao"
affects: [07-05, 07-06, fichas]

tech-stack:
  added: []
  patterns:
    - "displayName como campo livre na ficha, itemResultanteId como ancora canonica no backend"
    - "buildFichaIndicators centraliza calculo de FC/IC reutilizado em listagem e detalhe"
    - "formatPercent para renderizar decimais como percentual na grade e no cabecalho"

key-files:
  modified:
    - prisma/schema.prisma
    - src/modules/engineering/server/ficha-form-schema.ts
    - src/modules/engineering/server/engineering-repository.ts
    - src/modules/engineering/ui/ficha-form.tsx
    - src/modules/engineering/ui/fichas-listing-view.tsx
    - src/app/(app)/fichas/[fichaId]/page.tsx
    - src/app/(app)/fichas/nova/page.tsx
    - src/tests/unit/ficha-form.test.tsx
    - src/tests/unit/fichas-page.test.tsx
    - src/tests/unit/ficha-detail-page.test.tsx

key-decisions:
  - "Nome livre da ficha persiste em nomeExibicao (coluna nome_exibicao) sem romper vinculo com itemResultanteId canonico"
  - "FC e IC calculados via buildFichaIndicators reutilizado no cabecalho e na grade, garantindo consistencia"
  - "ResumoFichaSidebar mantido como dead code no repositorio mas desvinculado de todas as paginas"

patterns-established:
  - "displayName: campo livre de UI que convive com item canonico no backend"
  - "formatPercent: renderizacao uniforme de FC/IC como percentual em todas as superficies"

requirements-completed: [PDFV2-CRIT-01, PDFV2-FICHA-01, PDFV2-FICHA-04, PDFV2-FICHA-06]

duration: 8min
completed: 2026-04-10
---

# Phase 07 Plan 04: Identidade da ficha Summary

**Produto livre, cabecalho consolidado (Peso Final / FC / IC) e grade de fichas expandida com 12 colunas operacionais**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10T18:33:07Z
- **Completed:** 2026-04-10T18:41:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- A ficha passou a usar nome livre (displayName) no cabecalho e na grade, enquanto o item mestre canonico permanece como ancora tecnica no backend via itemResultanteId
- O cabecalho do formulario exibe Peso Final, Fator de Correcao e Indice de Coccao nessa ordem, com nomenclatura corrigida e formatacao percentual; campos legados (Mod. rendimento, % de Coccao, Peso final (g)) e a sidebar ResumoFichaSidebar foram removidos da UX
- A grade de fichas expandiu para 12 colunas: Codigo, Produto, Versao, Modalidade, Grupo Operacional, Status, Componentes, FC, IC, Custo Total, Ultima Atualizacao e Icone Observacao, com custo em destaque e observacao via tooltip

## Task Commits

Implementation was previously committed in batch during local execution:

1. **Task 1: Introduzir nome livre da ficha preservando o item mestre canonico** - `f6b5a65` / `97d15a3` (feat)
2. **Task 2: Reescrever cabecalho e grade de fichas com nomenclatura correta de FC/IC** - `f6b5a65` / `97d15a3` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `prisma/schema.prisma` - Campo nomeExibicao e relacao unidadeRendimento na FichaTecnica
- `src/modules/engineering/server/ficha-form-schema.ts` - Parser aceita displayName, yieldUnitCode e groupOperational
- `src/modules/engineering/server/engineering-repository.ts` - saveFicha persiste nomeExibicao; resolveCanonicalFichaItem cria item canonico quando itemId esta vazio; buildFichaIndicators centraliza FC/IC; mapFichaListRow e mapFichaDetail usam resolveFichaDisplayName
- `src/modules/engineering/ui/ficha-form.tsx` - TextField livre para Produto, cabecalho com Peso Final / FC / IC, sem campos legados
- `src/modules/engineering/ui/fichas-listing-view.tsx` - 12 colunas com FC, IC, Codigo, Grupo Operacional, Componentes, Custo Total em destaque e Icone Observacao com tooltip
- `src/app/(app)/fichas/[fichaId]/page.tsx` - Detalhe sem ResumoFichaSidebar, passando displayName para o form
- `src/app/(app)/fichas/nova/page.tsx` - Criacao com campo livre e stage types
- `src/tests/unit/ficha-form.test.tsx` - Verifica displayName, cabecalho, ausencia de campos legados
- `src/tests/unit/fichas-page.test.tsx` - Verifica colunas FC, IC, Codigo, Grupo Operacional na grade
- `src/tests/unit/ficha-detail-page.test.tsx` - Verifica ausencia da sidebar legada

## Decisions Made

- Nome livre da ficha persiste em `nomeExibicao` (coluna `nome_exibicao`) sem romper vinculo com `itemResultanteId` canonico -- atende ao pedido do PDF sem sacrificar rastreabilidade
- FC e IC calculados via `buildFichaIndicators` reutilizado no cabecalho e na grade, garantindo consistencia entre as duas superficies
- `ResumoFichaSidebar` mantido como dead code no repositorio para nao gerar diff desnecessario; ja desvinculado de todas as paginas

## Deviations from Plan

None - implementation matches plan specification. All acceptance criteria verified.

## Issues Encountered

None - the implementation was already in place from a prior local execution session and all tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- O contrato de ficha esta estabilizado para 07-05 (Cadastro de Item) e 07-06 (Ficha Tecnica completa)
- A grade de fichas esta pronta para receber filtros adicionais de Modalidade e Grupo quando 07-06 os implementar

## Self-Check: PASSED

- All 14 acceptance criteria verified (grep checks)
- All 4 unit tests pass (ficha-form 2, fichas-page 1, ficha-detail-page 1)
- Typecheck passes cleanly
- All key files exist on disk
- Summary file created at expected path

---
*Phase: 07-correcao-pdf-v2*
*Completed: 2026-04-10*
