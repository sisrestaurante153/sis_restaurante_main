---
phase: 08
plan: 01
plan_id: 08-01
description: NaN/null guards no Quadro Final (PDFV2-CRIT-03..07) — isolado, blast radius pequeno, desbloqueia confianca visual
type: execute
wave: 1
depends_on: []
files_modified:
  - src/modules/engineering/ui/TotaisIndicadores.tsx
  - src/modules/engineering/ui/components-editor.tsx
  - src/tests/unit/engineering/TotaisIndicadores.test.tsx
  - src/tests/unit/platform/env.test.ts
autonomous: true
requirements:
  - PDFV2-CRIT-03
  - PDFV2-CRIT-04
  - PDFV2-CRIT-05
  - PDFV2-CRIT-06
  - PDFV2-CRIT-07
tags:
  - engineering
  - ficha
  - nan-guards
  - tdd
must_haves:
  truths:
    - "Quadro Final nunca renderiza string contendo 'NaN', 'null' ou 'undefined'."
    - "Campo 'Venda de referencia' exibe '--' quando salePriceInput e vazio/invalido."
    - "CMV sem embalagem, CMV com embalagem e CMV final aplicado exibem literal 'Calcular peso' quando postCookingWeight esta ausente/zero/invalido."
    - "Margem de contribuicao R$ exibe literal 'Informe o valor' quando salePriceInput e vazio/zero/invalido."
    - "App falha explicitamente com throw quando SESSION_SECRET ausente em producao (sem fallback hardcoded)."
  artifacts:
    - path: "src/modules/engineering/ui/TotaisIndicadores.tsx"
      provides: "Quadro Final com fallbacks condicionais 'Calcular peso' / 'Informe o valor'"
      contains: "Calcular peso"
    - path: "src/tests/unit/engineering/TotaisIndicadores.test.tsx"
      provides: "Cobertura unit de CRIT-03, 05, 06, 07"
      min_lines: 80
    - path: "src/tests/unit/platform/env.test.ts"
      provides: "Cobertura CRIT-04 (SESSION_SECRET throw)"
      min_lines: 20
  key_links:
    - from: "components-editor.tsx (summary.referencePrice)"
      to: "TotaisIndicadores operationalReading linha 307"
      via: "prop summary"
      pattern: "referencePrice"
    - from: "TotaisIndicadores.tsx (costsAndCmv)"
      to: "summary.postCookingWeight"
      via: "weightMissing derivation"
      pattern: "Calcular peso"
---

<objective>
Fechar os 5 bugs P1 de NaN/null/undefined no Quadro Final (PDFV2-CRIT-03 a 07) e confirmar
PDFV2-CRIT-04 (SESSION_SECRET sem fallback). Blast radius isolado — executa primeiro para
devolver confianca visual antes do refactor de schema.

Purpose: zerar ocorrencias de `R$ NaN` / `-- / kg` / `null` / `undefined` nas 4 telas afetadas,
cumprindo criterio de sucesso #5 da Phase 8 ("Zero campo com NaN/null/undefined nas telas afetadas.").
Output: guards condicionais em `TotaisIndicadores.tsx` + sanitizacao do `referencePrice` em
`components-editor.tsx` + testes Vitest/RTL cobrindo CRIT-03/05/06/07 + teste env CRIT-04.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-VALIDATION.md
@src/modules/engineering/ui/TotaisIndicadores.tsx
@src/modules/engineering/ui/components-editor.tsx
@src/tests/unit/components-editor.test.tsx

<interfaces>
<!-- Contratos que o executor precisa. Extraido de 08-RESEARCH.md §3 + 08-PATTERNS.md §9. -->

TotaisIndicadores.tsx helpers existentes (lines 33-50 — reutilizar):
```ts
function parseFiniteMetric(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetricValue(value: string | null | undefined, formatter: (parsed: number) => string): string {
  const parsed = parseFiniteMetric(value);
  if (parsed === null) return value && value.trim() !== "" ? value : "--";
  return formatter(parsed);
}
```

Campos de `summary` consumidos (prop shape de TotaisIndicadoresProps):
```ts
interface FichaTotalsSummary {
  postCookingWeight: string;           // peso pos-coccao como string; "--" quando ausente
  costWithoutPackagingPerKg: string | null;
  costWithPackagingPerKg: string | null;
  finalAppliedCmv: string | null;
  contributionMarginValue: string | null;
  referencePrice: string | null;       // usado por operationalReading linha 307
  // ...
}
```

Derivacao de weightMissing (novo helper a adicionar):
```ts
const weightMissing =
  summary.postCookingWeight === "--" ||
  summary.postCookingWeight === "" ||
  !Number.isFinite(Number(summary.postCookingWeight));
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0): Criar test stubs RED para CRIT-03/05/06/07 e env CRIT-04</name>
  <files>src/tests/unit/engineering/TotaisIndicadores.test.tsx, src/tests/unit/platform/env.test.ts</files>
  <read_first>
    - src/modules/engineering/ui/TotaisIndicadores.tsx (integral — entender shape de summary e props)
    - src/tests/unit/components-editor.test.tsx (analog para render+RTL, linhas 1-60)
    - src/modules/platform/server/env.ts (entender getServerEnv e SESSION_SECRET check)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §3 (sketch UI condicional linhas 52-69)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-VALIDATION.md (Wave 0 Requirements)
  </read_first>
  <behavior>
    - Test CRIT-03: render TotaisIndicadores com `summary.referencePrice = null` -> UI contem "--" e NAO contem "NaN".
    - Test CRIT-05: render com `summary.postCookingWeight = "--"` -> linhas "CMV sem embalagem", "CMV com Embalagem", "CMV final aplicado" contem literal "Calcular peso".
    - Test CRIT-05 (2): render com `summary.postCookingWeight = ""` -> mesmo fallback "Calcular peso".
    - Test CRIT-05 (3): render com `summary.postCookingWeight = "abc"` (nao finite) -> mesmo fallback "Calcular peso".
    - Test CRIT-06: render com `salePriceInput = ""` -> linha "Margem de contribuicao R$" contem "Informe o valor" e NAO "NaN".
    - Test CRIT-06 (2): render com `salePriceInput = "0"` -> mesmo fallback "Informe o valor".
    - Test CRIT-07: render com postCookingWeight vazio -> "CMV da marmita" / "CMV final aplicado" contem "Calcular peso" (nao divisao invalida).
    - Test guard global: render com multiplos campos invalidos -> container.textContent NAO contem "NaN", "null", "undefined".
    - Test CRIT-04: chamar `getServerEnv()` em ambiente onde `process.env.SESSION_SECRET` e undefined em NODE_ENV=production -> throw Error com mensagem contendo "SESSION_SECRET".
  </behavior>
  <action>
Criar `src/tests/unit/engineering/TotaisIndicadores.test.tsx` (novo arquivo) seguindo o analog
`src/tests/unit/components-editor.test.tsx` (imports de `@testing-library/react`, `vitest`,
componente importado de `@/modules/engineering/ui/TotaisIndicadores`).

Construir um `baseSummary` helper que preenche TODOS os campos obrigatorios de
`FichaTotalsSummary` com strings numericas validas, e cada teste sobrescreve apenas os campos
relevantes. Use `render(<TotaisIndicadores summary={...} salePriceInput="..." .../>)` e
asserte via `screen.getByText(/Calcular peso/i)` e `expect(container.textContent).not.toMatch(/NaN|null|undefined/)`.

Estrutura mandatoria (copiar):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TotaisIndicadores } from "@/modules/engineering/ui/TotaisIndicadores";

const baseSummary = { /* completar com campos validos — ver prop types no componente */ };

describe("TotaisIndicadores — NaN guards (PDFV2-CRIT-03/05/06/07)", () => {
  it('CRIT-03: referencePrice null renderiza "--", nunca "R$ NaN"', () => { /* ... */ });
  it('CRIT-05: postCookingWeight "--" renderiza "Calcular peso" em CMV sem embalagem', () => { /* ... */ });
  it('CRIT-05: postCookingWeight "" renderiza "Calcular peso" em CMV com Embalagem', () => { /* ... */ });
  it('CRIT-05: postCookingWeight nao finite renderiza "Calcular peso" em CMV final aplicado', () => { /* ... */ });
  it('CRIT-06: salePriceInput "" renderiza "Informe o valor" em Margem de contribuicao R$', () => { /* ... */ });
  it('CRIT-06: salePriceInput "0" renderiza "Informe o valor"', () => { /* ... */ });
  it('CRIT-07: divisao invalida substituida por "Calcular peso" em CMV da marmita (N-03: usar fixture distinta — `baseSummaryMarmita` com `postCookingWeight=""` + `costPerMarmita` nao-nulo — OU comentar in-test que cenario e equivalente ao CRIT-05 cmvWithPackagingPerKg, com divisao por peso_final tambem vazio)', () => { /* ... */ });
  it("guard global: nunca renderiza NaN/null/undefined com inputs invalidos", () => {
    const { container } = render(<TotaisIndicadores summary={{ ...baseSummary, postCookingWeight: "", referencePrice: null, contributionMarginValue: null }} salePriceInput="" /* outros props obrigatorios */ />);
    expect(container.textContent).not.toMatch(/NaN|null|undefined/);
  });
});
```

Para `src/tests/unit/platform/env.test.ts` (novo):
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
describe("getServerEnv — SESSION_SECRET (PDFV2-CRIT-04)", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  it("throws quando SESSION_SECRET ausente em production sem fallback hardcoded", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    const { getServerEnv } = await import("@/modules/platform/server/env");
    expect(() => getServerEnv()).toThrow(/SESSION_SECRET/);
  });

  it("nao usa fallback hardcoded (verificar que o codigo nao contem string literal do fallback antigo)", async () => {
    // Confirmar que env.ts nao contem fallback literal; se ja estava removido em f01a522, teste apenas confirma throw.
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    const { getServerEnv } = await import("@/modules/platform/server/env");
    expect(() => getServerEnv()).toThrow();
  });
});
```

**Se `src/tests/unit/platform/env.test.ts` ja existe**, ESTENDER com os dois `it` acima (nao duplicar describe existente). Verificar primeiro com `ls src/tests/unit/platform/`.

IMPORTANTE: nesta task os testes DEVEM FALHAR (RED) porque o codigo do fallback "Calcular peso"
e "Informe o valor" ainda nao existe. Nao e erro — e o gate TDD da Task 2.
  </action>
  <verify>
    <automated>mkdir -p .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts && npm run test:unit -- TotaisIndicadores 2>&1 | tee .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-red.log && (grep -qE 'FAIL|failed' .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-red.log || (echo 'ERROR: RED gate not reached — tests did not fail' && exit 1))</automated>
  </verify>
  <acceptance_criteria>
    - Arquivo `src/tests/unit/engineering/TotaisIndicadores.test.tsx` existe com pelo menos 8 `it(...)` blocos cobrindo CRIT-03/05/06/07 + guard global
    - Arquivo `src/tests/unit/platform/env.test.ts` existe (ou foi estendido) com pelo menos 1 `it` testando throw quando SESSION_SECRET ausente
    - `npm run test:unit -- TotaisIndicadores` retorna pelo menos 1 teste FAIL (estado RED esperado antes da Task 2)
    - `grep -c 'Calcular peso' src/tests/unit/engineering/TotaisIndicadores.test.tsx` >= 3
    - `grep -c 'Informe o valor' src/tests/unit/engineering/TotaisIndicadores.test.tsx` >= 1
    - `grep -c 'not.toMatch(/NaN|null|undefined' src/tests/unit/engineering/TotaisIndicadores.test.tsx` >= 1
  </acceptance_criteria>
  <done>Testes criados e reproduzindo RED de todos os gaps descritos na pesquisa (§3 RESEARCH).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2 (GREEN): Implementar guards "Calcular peso" / "Informe o valor" em TotaisIndicadores + sanitizar referencePrice em components-editor</name>
  <files>src/modules/engineering/ui/TotaisIndicadores.tsx, src/modules/engineering/ui/components-editor.tsx</files>
  <read_first>
    - src/modules/engineering/ui/TotaisIndicadores.tsx (integral — entender estrutura costsAndCmv linhas 198-219, marginRow linha 272, operationalReading linha 307)
    - src/modules/engineering/ui/components-editor.tsx (trecho que calcula summary.referencePrice a partir de salePriceInput)
    - src/tests/unit/engineering/TotaisIndicadores.test.tsx (criado na Task 1 — gate GREEN)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §3 (sketches de codigo linhas 52-69)
  </read_first>
  <action>
Em `src/modules/engineering/ui/TotaisIndicadores.tsx`:

1. Adicionar helper no topo do componente (apos o destructuring de props):

```tsx
const weightMissing =
  summary.postCookingWeight === "--" ||
  summary.postCookingWeight === "" ||
  !Number.isFinite(Number(summary.postCookingWeight));

const salePriceValid =
  parseFiniteMetric(salePriceInput) !== null && Number(salePriceInput) > 0;
```

2. Em `costsAndCmv` (regiao atual linhas 198-219), substituir as 3 chamadas de `formatMetricValue`
para `costWithoutPackagingPerKg`, `costWithPackagingPerKg`, `finalAppliedCmv` por branches
condicionais. Exemplo para a primeira (replicar para as outras 2):

```tsx
const cmvWithoutPackagingLabel = weightMissing
  ? "Calcular peso"
  : formatMetricValue(summary.costWithoutPackagingPerKg, (parsed) => `${currencyFormatter.format(parsed)} / kg`);
metricRow("CMV sem embalagem", cmvWithoutPackagingLabel);
```

Aplicar mesma estrutura em:
- Linha equivalente a "CMV com Embalagem" (hoje tambem `formatMetricValue(summary.costWithPackagingPerKg, ...)`) -> usar `weightMissing ? "Calcular peso" : formatMetricValue(...)`.
- Linha equivalente a "CMV final aplicado" (hoje `formatMetricValue(summary.finalAppliedCmv, ...)`) -> usar `weightMissing ? "Calcular peso" : formatMetricValue(...)`.

Para CRIT-07 (CMV da marmita): se houver row explicito "CMV da marmita"/"CMV por marmita",
aplicar o mesmo `weightMissing ? "Calcular peso" : ...`. Se a row nao existir separadamente
e e derivada da mesma divisao de `finalAppliedCmv`, o guard ja cobriu via linha acima.

3. Margem de contribuicao R$ (linha ~272, `formatCurrency(summary.contributionMarginValue)`):

```tsx
const marginValue = salePriceValid
  ? formatCurrency(summary.contributionMarginValue)
  : "Informe o valor";
metricRow("Margem de contribuicao R$", marginValue, { highlight: true });
```

4. `operationalReading` linha ~307 (`formatCurrency(summary.referencePrice)`): nao mudar aqui;
a fonte e `summary.referencePrice` que precisa vir ja sanitizado do presenter. Se `referencePrice`
for `null` ou `"NaN"`, `formatCurrency` existente deve devolver `"--"`. Confirme que `formatCurrency`
usa `parseFiniteMetric` — se nao usa, ajuste-o para retornar `"--"` quando input for invalido.

Em `src/modules/engineering/ui/components-editor.tsx`:

5. Localizar o calculo de `summary.referencePrice` (derivado de `salePriceInput`). Garantir que:

```ts
const parsedSale = Number(salePriceInput);
const referencePrice = Number.isFinite(parsedSale) && parsedSale > 0
  ? parsedSale.toFixed(2)
  : null;
```

Se hoje `referencePrice` e uma string sempre (nunca null), mudar para `string | null` e propagar
o tipo em `FichaTotalsSummary` (importado dos types).

NAO alterar nenhum outro comportamento de `components-editor.tsx` (apenas sanitizacao do input
de venda). Preservar tudo que foi entregue em pendencias-v3 (item 10 FichaFlatGrid, etc.).
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:unit -- TotaisIndicadores</automated>
  </verify>
  <acceptance_criteria>
    - `npm run test:unit -- TotaisIndicadores` retorna 0 (GREEN — todos os testes da Task 1 passam)
    - `grep -c 'Calcular peso' src/modules/engineering/ui/TotaisIndicadores.tsx` >= 3
    - `grep -c 'Informe o valor' src/modules/engineering/ui/TotaisIndicadores.tsx` >= 1
    - `grep -c 'weightMissing' src/modules/engineering/ui/TotaisIndicadores.tsx` >= 1
    - `grep -c 'salePriceValid' src/modules/engineering/ui/TotaisIndicadores.tsx` >= 1
    - `grep -c 'referencePrice.*null' src/modules/engineering/ui/components-editor.tsx` >= 1 (ou regex equivalente confirmando que referencePrice pode ser null)
    - `npm run typecheck` exits 0
  </acceptance_criteria>
  <done>Guards implementados, testes RED da Task 1 viram GREEN, typecheck verde, nenhuma regressao em components-editor.test.tsx existente.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3 (GREEN + Confirm): Confirmar CRIT-04 (SESSION_SECRET sem fallback) e rodar regressao engineering-flow</name>
  <files>src/modules/platform/server/env.ts (read-only, apenas confirmar), src/tests/unit/platform/env.test.ts</files>
  <read_first>
    - src/modules/platform/server/env.ts (integral — confirmar ausencia de fallback hardcoded)
    - src/tests/unit/platform/env.test.ts (criado na Task 1)
    - .planning/codebase/CONCERNS.md (status SESSION_SECRET marcado como RESOLVIDO em f01a522)
    - .planning/quick/20260417-pendencias-v3/SUMMARY.md §Housekeeping H2
  </read_first>
  <action>
1. Abrir `src/modules/platform/server/env.ts`. Confirmar que `getServerEnv()` lanca erro
explicito se `SESSION_SECRET` ausente em producao. Nao deve haver string literal de fallback
(ex.: `"dev-secret"`, `"changeme"`).

2. Rodar `npm run test:unit -- env` — teste da Task 1 deve passar GREEN sem alterar env.ts.

3. Se `env.ts` AINDA tiver fallback hardcoded (contrariando a expectativa do commit f01a522),
remove-lo: lancar `throw new Error("SESSION_SECRET is required in production")` quando
`process.env.NODE_ENV === "production"` e `SESSION_SECRET` ausente. Rodar teste novamente.

4. Rodar regressao E2E para garantir que engineering-flow permanece verde apos guards:
`npm run test:e2e -- engineering-flow` — deve passar sem mudancas funcionais visiveis alem do
texto `Calcular peso` / `Informe o valor` quando aplicavel.

5. Rodar suite unitaria completa do engineering: `npm run test:unit -- engineering` — deve
passar GREEN em todos os specs existentes (components-editor, ficha-form, ficha-detail-page,
TotaisIndicadores novo).

6. Atualizar `.planning/REQUIREMENTS.md` marcando `PDFV2-CRIT-03..07` como `Complete` na tabela
Traceability (status Phase 8). Commit junto com codigo do plano.
  </action>
  <verify>
    <automated>npm run test:unit -- env && npm run test:unit -- engineering && npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `npm run test:unit -- env` exits 0
    - `grep -E '"dev-secret"|"changeme"|"default-secret"' src/modules/platform/server/env.ts` returns 0 matches (sem fallback hardcoded)
    - `npm run test:unit -- engineering` exits 0 (zero regressao)
    - `npm run test:e2e -- engineering-flow` exits 0 (regressao passa)
    - `.planning/REQUIREMENTS.md` tem PDFV2-CRIT-03, 04, 05, 06, 07 marcados como Complete na tabela Traceability
  </acceptance_criteria>
  <done>CRIT-03..07 confirmados e fechados; regressao engineering-flow passa; REQUIREMENTS.md atualizado.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client -> server (ficha form submit) | salePriceInput vem como string nao validada ao presenter |
| env ingestion (process.env) | SESSION_SECRET consumido apenas em server runtime |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01-01 | Tampering | salePriceInput string manipulado | mitigate | parseFiniteMetric + Number.isFinite antes de usar; nunca eval; render fallback literal "Informe o valor" quando invalido (CRIT-06) |
| T-08-01-02 | Info Disclosure | SESSION_SECRET exposto via fallback hardcoded | mitigate | getServerEnv() throws em production quando ausente; zero string de fallback literal (grep -E '"dev-secret"|"changeme"' returns 0) — CRIT-04 |
| T-08-01-03 | Denial of Service | divisao por zero / NaN propagation trava render | mitigate | weightMissing check antes de divisao; exibicao de literal "Calcular peso" — CRIT-05/07 |
| T-08-01-04 | Spoofing | N/A | accept | Plano puramente UI guard + test — sem surface de auth |
</threat_model>

<verification>
- `npm run typecheck` -> 0
- `npm run test:unit -- TotaisIndicadores` -> 0 (8 testes passam)
- `npm run test:unit -- env` -> 0
- `npm run test:unit -- engineering` -> 0 (zero regressao)
- `npm run test:e2e -- engineering-flow` -> 0
- grep guards: "Calcular peso" >=3 ocorrencias em TotaisIndicadores.tsx, "Informe o valor" >=1
- Nenhuma ocorrencia de "NaN"/"null"/"undefined" no textContent de render com inputs invalidos
</verification>

<success_criteria>
1. 5 bugs P1 fechados (CRIT-03, 04, 05, 06, 07) com cobertura unit em `TotaisIndicadores.test.tsx` + `env.test.ts`.
2. Quadro Final exibe strings literais ("Calcular peso", "Informe o valor", "--") ao inves de NaN/null/undefined.
3. Zero regressao em `engineering-flow` E2E, `components-editor.test.tsx`, `ficha-form.test.tsx`.
4. REQUIREMENTS.md atualizado marcando CRIT-03..07 como Complete.
5. Feedback latency per task < 60s.
</success_criteria>

<output>
Apos completar, criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-01-nan-null-guards-SUMMARY.md`
</output>
</content>
</invoke>