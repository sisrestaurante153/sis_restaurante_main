---
phase: 07-correcao-pdf-v2
plan: 01
subsystem: auth
tags: [session, env, vitest, ui, fallback, pdf-v2]
requires:
  - phase: 06
    provides: "Quadro final da ficha e estrutura base da leitura comercial"
provides:
  - "Helper centralizado getRequiredSessionSecret() para runtime de sessao"
  - "Fallbacks coerentes para venda invalida, peso final ausente e margens derivadas"
  - "Cobertura de regressao para auth e Quadro Final"
affects: [07-02, 07-06, auth, quadro-final]
tech-stack:
  added: []
  patterns:
    - "Leitura obrigatoria de segredo sensivel via helper centralizado de env"
    - "Validacao Number.isFinite antes de formatar metricas comerciais"
key-files:
  created: []
  modified:
    - src/modules/platform/server/env.ts
    - src/modules/access/server/session-cookie.ts
    - src/middleware.ts
    - src/app/api/auth/login/route.ts
    - src/modules/engineering/server/engineering-repository.ts
    - src/modules/engineering/ui/components-editor.tsx
    - src/modules/engineering/ui/TotaisIndicadores.tsx
    - src/tests/unit/session.test.ts
    - src/tests/unit/auth-routes.test.ts
    - src/tests/unit/ficha-form.test.tsx
key-decisions:
  - "SESSION_SECRET deixou de ter fallback implícito e agora falha explicitamente quando ausente."
  - "O resumo comercial passa a carregar fallbacks textuais no backend e no compositor client-side para nao vazar NaN ou campos em branco."
patterns-established:
  - "Fluxos de sessao devem depender de getRequiredSessionSecret() em vez de literals ou defaults de schema."
  - "Linhas do Quadro Final devem receber string valida ou fallback orientativo antes da formatacao visual."
requirements-completed: [PDFV2-CRIT-03, PDFV2-CRIT-04, PDFV2-CRIT-05, PDFV2-CRIT-06, PDFV2-CRIT-07]
duration: 7 min
completed: 2026-04-02
---

# Phase 07 Plan 01: Hardening de seguranca e guardas numericas Summary

**Mandatory `SESSION_SECRET` resolution for auth runtime and NaN-safe commercial fallbacks across the PDF v2 Quadro Final**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-02T16:39:00Z
- **Completed:** 2026-04-02T16:46:02Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Centralizei a leitura obrigatoria de `SESSION_SECRET` e removi qualquer assinatura de sessao com fallback hardcoded.
- Normalizei o resumo comercial para devolver `--`, `Calcular peso` e `Informe o valor` em vez de `NaN`, divisao invalida ou branco.
- Adicionei regressao automatizada cobrindo login/sessao e o Quadro Final da ficha com fallbacks comerciais.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remover fallback hardcoded de SESSION_SECRET** - `f01a522` (fix)
2. **Task 2: Blindar metricas comerciais contra valores nao finitos e divisoes invalidas** - `349e0a6` (fix)

## Files Created/Modified
- `src/modules/platform/server/env.ts` - tornou `SESSION_SECRET` opcional no parse geral e obrigatorio no helper dedicado `getRequiredSessionSecret()`.
- `src/modules/access/server/session-cookie.ts` - alinhou criacao/leitura de sessao ao helper obrigatorio de segredo.
- `src/middleware.ts` - removeu o literal hardcoded da validacao de sessao.
- `src/app/api/auth/login/route.ts` - removeu o literal hardcoded da emissao do token.
- `src/modules/engineering/server/engineering-repository.ts` - passou a gerar fallbacks textuais coerentes para venda, peso final e margens derivadas.
- `src/modules/engineering/ui/components-editor.tsx` - manteve os mesmos guardas de venda/peso no resumo client-side.
- `src/modules/engineering/ui/TotaisIndicadores.tsx` - blindou formatacao de moeda e exibicao das metricas comerciais com `Number.isFinite`.
- `src/tests/unit/session.test.ts` - injeta `SESSION_SECRET` no ambiente de teste.
- `src/tests/unit/auth-routes.test.ts` - injeta `SESSION_SECRET` no ambiente de teste das rotas de auth.
- `src/tests/unit/ficha-form.test.tsx` - cobre `Calcular peso`, `Informe o valor` e ausencia de `NaN` no Quadro Final.

## Decisions Made
- `SESSION_SECRET` deixou de ser um default do schema de ambiente para evitar qualquer caminho de assinatura com segredo implícito.
- `buildCommercialSummary()` passou a devolver fallbacks orientativos no contrato do presenter, em vez de delegar esse tratamento apenas para a UI.
- `components-editor.tsx` foi ajustado junto da Task 2 porque ele recalculava parte do resumo no cliente e sobrescrevia fallbacks vindos do servidor.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Alinhado o caminho central de cookie de sessao ao novo helper obrigatorio**
- **Found during:** Task 1 (Remover fallback hardcoded de SESSION_SECRET)
- **Issue:** `session-cookie.ts` ainda dependia de `getServerEnv().SESSION_SECRET`, o que deixaria um caminho secundario de sessao fora do hardening pedido pelo plano.
- **Fix:** Passei criacao e leitura de sessao para `getRequiredSessionSecret()` e atualizei `env.test.ts` para refletir a ausencia de default no parse geral.
- **Files modified:** `src/modules/access/server/session-cookie.ts`, `src/modules/platform/server/env.ts`, `src/tests/unit/env.test.ts`
- **Verification:** `npx vitest run src/tests/unit/session.test.ts src/tests/unit/auth-routes.test.ts`
- **Committed in:** `f01a522`

**2. [Rule 1 - Bug] Corrigido o compositor client-side que apagava fallbacks comerciais**
- **Found during:** Task 2 (Blindar metricas comerciais contra valores nao finitos e divisoes invalidas)
- **Issue:** `components-editor.tsx` recalculava campos comerciais no cliente e convertia cenarios de venda/peso invalidos para `--`, derrubando `Calcular peso` e `Informe o valor`.
- **Fix:** Repliquei as guardas de peso e venda no resumo client-side para preservar os mesmos fallbacks esperados pelo Quadro Final.
- **Files modified:** `src/modules/engineering/ui/components-editor.tsx`, `src/modules/engineering/ui/TotaisIndicadores.tsx`, `src/tests/unit/ficha-form.test.tsx`
- **Verification:** `npx vitest run src/tests/unit/ficha-form.test.tsx`
- **Committed in:** `349e0a6`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Ambos os ajustes foram necessarios para fechar corretamente os P1 sem expandir escopo funcional alem do hardening previsto.

## Issues Encountered
- `npm run typecheck` atualizou `tsconfig.tsbuildinfo`; o artefato gerado foi restaurado para evitar ruido fora do escopo do plano.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Os P1 de segredo de sessao e de leitura comercial do Quadro Final estao fechados, liberando foco para contrato e persistencia operacional de item em `07-02`.
- O padrao de fallback (`--`, `Calcular peso`, `Informe o valor`) ja esta estabelecido para ser reutilizado no simulador comercial de `07-06`.

## Self-Check
PASSED
- Found `.planning/phases/07-correcao-pdf-v2/07-01-SUMMARY.md`
- Found commit `f01a522`
- Found commit `349e0a6`

---
*Phase: 07-correcao-pdf-v2*
*Completed: 2026-04-02*
