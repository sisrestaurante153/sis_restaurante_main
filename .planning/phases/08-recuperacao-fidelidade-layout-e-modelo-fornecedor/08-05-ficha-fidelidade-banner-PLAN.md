---
phase: 08
plan: 05
plan_id: 08-05
description: Ficha fidelidade — re-validacao pixel-perfect (item 10, FC/IC, botao Coccao Final, FichaFlatGrid) + banner PDFV2-FICHA-07 "ingrediente ja aparece em ficha semelhante"
type: execute
wave: 3
depends_on:
  - 08-01
  - 08-02
files_modified:
  - src/modules/engineering/ui/FichaFlatGrid.tsx
  - src/modules/engineering/ui/components-editor.tsx
  - src/modules/engineering/ui/SimilarFichasBanner.tsx
  - src/modules/engineering/server/ficha-similar-lookup.ts
  - tests/e2e/engineering-flow.spec.ts
  - src/tests/unit/engineering/FichaFlatGrid.test.tsx
autonomous: true
requirements:
  - SPEC-FICHA-FIDELIDADE
  - PDFV2-FICHA-07
tags:
  - engineering
  - ficha
  - banner
  - pixel-perfect
must_haves:
  truths:
    - "FichaFlatGrid GRID_TEMPLATE bate exatamente as larguras do HTML tela-ficha-tecnica-v2.html (handle | Item | Qtde | Unidade | Etapa | Custo unit | Custo insumo | del)."
    - "FC/IC coloridos na grade (pendencias-v3 #4) continuam conforme HTML."
    - "Botao 'Adicionar Coccao Final' aparece quando Coccao Final foi removida; esconde quando visivel."
    - "Coccao Final permanece como bloco dedicado (Phase 7 pattern — nao migrar para flag is_final)."
    - "Ao adicionar ingrediente em ficha com modalidade X, sistema busca outras fichas ativas/rascunho com modalidade=X e mesmo item_componente; exibe banner inline com o nome da ficha encontrada."
    - "Banner e inline (Alert severity=info com fontSize 12), nao bloqueante; usuario pode ignorar."
    - "Criterio de semelhanca: mesma modalidade + mesmo itemComponenteId + status in (ativa, rascunho)."
    - "Server action findFichasUsingItem e authz-gated (herda middleware de server actions; zero bypass)."
  artifacts:
    - path: "src/modules/engineering/server/ficha-similar-lookup.ts"
      provides: "Server action findFichasUsingItem — busca fichas semelhantes"
      exports: ["findFichasUsingItem"]
    - path: "src/modules/engineering/ui/SimilarFichasBanner.tsx"
      provides: "Componente Alert info inline com Link para ficha semelhante"
      min_lines: 30
    - path: "src/modules/engineering/ui/components-editor.tsx"
      provides: "Hook useEffect que chama findFichasUsingItem em onChange do item + renderiza banner"
      contains: "findFichasUsingItem"
    - path: "src/tests/unit/engineering/FichaFlatGrid.test.tsx"
      provides: "Snapshot do GRID_TEMPLATE + render com/sem Coccao Final"
      min_lines: 40
  key_links:
    - from: "components-editor.tsx updateRow (select item)"
      to: "findFichasUsingItem(itemComponenteId, currentFichaId, modalidadeId)"
      via: "useEffect"
      pattern: "findFichasUsingItem"
    - from: "ficha-similar-lookup.ts"
      to: "prisma.fichaTecnica.findMany"
      via: "modalidadeId + componentes.some.itemComponenteId"
      pattern: "findMany"
    - from: "SimilarFichasBanner.tsx"
      to: "Link para /fichas/{id}"
      via: "href prop"
      pattern: "/fichas/"
---

<objective>
Duas entregas combinadas:

1. **Re-validacao pixel-perfect da ficha** (D-13): confirmar que FichaFlatGrid GRID_TEMPLATE,
   FC/IC coloridos e botao "Adicionar Coccao Final" (entregues em pendencias-v3) batem 1:1 com
   `update/tela-ficha-tecnica-v2.html` — corrigir divergencias se houver. Coccao Final segue
   como bloco dedicado (decisao Phase 7).

2. **Banner PDFV2-FICHA-07**: quando usuario adiciona ingrediente em uma ficha, sistema busca
   outras fichas com mesma modalidade + mesmo item_componente (status ativa/rascunho) e exibe
   banner inline "Este ingrediente ja aparece em: <nome da ficha>". Nao bloqueante.

Purpose: fechar SPEC-FICHA-FIDELIDADE (success criteria #3 Phase 8) e PDFV2-FICHA-07 pendente do
milestone v1.2.

Output: FichaFlatGrid confirmado + novo `SimilarFichasBanner` componente + server action
`findFichasUsingItem` + hook em components-editor + test unit FichaFlatGrid + cenario E2E novo
em engineering-flow.
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
@src/modules/engineering/ui/FichaFlatGrid.tsx
@src/modules/engineering/ui/components-editor.tsx
@src/modules/catalog/server/catalog-repository.ts
@update/tela-ficha-tecnica-v2.html
@.planning/quick/20260417-pendencias-v3/SUMMARY.md

<interfaces>
<!-- Extraido de 08-RESEARCH.md §7 + 08-PATTERNS.md §§10, 11. -->

Server action (novo arquivo — `src/modules/engineering/server/ficha-similar-lookup.ts`):
```ts
"use server";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { FichaStatus } from "@/generated/prisma/client";

export async function findFichasUsingItem(
  itemComponenteId: string,
  currentFichaId: string | null,
  modalidadeId: string | null
): Promise<Array<{ id: string; nomeExibicao: string; modalidadeNome: string | null }>> {
  if (!itemComponenteId || !modalidadeId) return [];
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
  if (!prisma) return [];
  try {
    const rows = await prisma.fichaTecnica.findMany({
      where: {
        id: currentFichaId ? { not: currentFichaId } : undefined,
        status: { in: [FichaStatus.ativa, FichaStatus.rascunho] },
        modalidadeId,
        componentes: { some: { itemComponenteId } }
      },
      select: { id: true, nomeExibicao: true, modalidade: { select: { nome: true } } },
      take: 5
    });
    return rows.map(r => ({
      id: r.id,
      nomeExibicao: r.nomeExibicao ?? "Ficha sem nome",
      modalidadeNome: r.modalidade?.nome ?? null
    }));
  } catch {
    return [];
  }
}
```

Banner component (novo arquivo — `src/modules/engineering/ui/SimilarFichasBanner.tsx`):
```tsx
import { Alert, Link } from "@mui/material";

export interface SimilarFicha { id: string; nomeExibicao: string; modalidadeNome: string | null }

export function SimilarFichasBanner({ fichas }: { fichas: SimilarFicha[] }) {
  if (!fichas.length) return null;
  const first = fichas[0];
  const extra = fichas.length - 1;
  return (
    <Alert severity="info" sx={{ fontSize: 12, py: 0.5, mt: 0.5 }}>
      Este ingrediente ja aparece em: <Link href={`/fichas/${first.id}`} underline="hover">{first.nomeExibicao}</Link>
      {extra > 0 && ` (+${extra})`}
    </Alert>
  );
}
```

Hook em components-editor.tsx (pseudocodigo):
```ts
const [similarFichas, setSimilarFichas] = useState<Record<string, SimilarFicha[]>>({});

useEffect(() => {
  const itemId = row.itemComponenteId;
  if (!itemId) return;
  let cancelled = false;
  (async () => {
    const res = await findFichasUsingItem(itemId, currentFichaId, modalidadeId);
    if (!cancelled) setSimilarFichas(prev => ({ ...prev, [row.id]: res }));
  })();
  return () => { cancelled = true; };
}, [row.itemComponenteId, currentFichaId, modalidadeId]);
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0 RED): Criar FichaFlatGrid.test.tsx + estender engineering-flow E2E spec para PDFV2-FICHA-07</name>
  <files>src/tests/unit/engineering/FichaFlatGrid.test.tsx, tests/e2e/engineering-flow.spec.ts</files>
  <read_first>
    - src/modules/engineering/ui/FichaFlatGrid.tsx (integral — capturar GRID_TEMPLATE atual)
    - update/tela-ficha-tecnica-v2.html linhas 224-354 (grid inline) + 356-379 (Coccao Final + botao)
    - tests/e2e/engineering-flow.spec.ts (integral — entender helpers selectMuiOption, uniqueName, padroes de navegacao)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §§7.1, 7.2
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md §§10, 15 (testing)
  </read_first>
  <behavior>
    Test unit FichaFlatGrid:
    - GRID_TEMPLATE exportado (ou inline no componente) bate 8 colunas: `22px minmax(240px, 1fr) 80px 60px 240px 96px 96px 32px`. Se ha helper export, importar; se nao, buscar string via container.querySelector/CSS.
    - Render com rows contendo linha de Coccao Final: expect row com label "Coccao / Preparo Final" visivel e botao "Adicionar Coccao Final" NAO visivel.
    - Render com rows SEM Coccao Final: expect row "Coccao / Preparo Final" nao visivel; expect botao "Adicionar Coccao Final" visivel.
    - Grid cf-row (Coccao Final) tem 7 colunas batendo HTML linhas 358-376 do HTML.

    Test E2E engineering-flow (extensao do spec existente):
    - Cenario novo "banner ingrediente em ficha semelhante": cria 2 fichas com mesma modalidade (ex: Bufe), em cada ficha adiciona o MESMO ingrediente (ex: Arroz). Na segunda ficha, apos selecionar o ingrediente no ComponentEditorRow, expect Alert visivel com texto "Este ingrediente ja aparece em" seguido de link com o nome da primeira ficha.
    - Verificar que o banner NAO aparece quando os ingredientes sao diferentes (cenario negativo).
    - Verificar que o banner NAO aparece quando as modalidades sao diferentes (cenario negativo).
  </behavior>
  <action>
**A) Criar `src/tests/unit/engineering/FichaFlatGrid.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FichaFlatGrid } from "@/modules/engineering/ui/FichaFlatGrid";

const baseRow = { /* stub minimo conforme props reais */ };

describe("FichaFlatGrid — SPEC-FICHA-FIDELIDADE (HTML tela-ficha-tecnica-v2.html)", () => {
  it("GRID_TEMPLATE bate HTML: 22px minmax(240px, 1fr) 80px 60px 240px 96px 96px 32px", () => {
    const { container } = render(<FichaFlatGrid rows={[baseRow]} /* outras props */ />);
    const gridEl = container.querySelector("[data-testid='ficha-flat-grid']") || container.firstElementChild;
    const style = window.getComputedStyle(gridEl as Element);
    expect(style.gridTemplateColumns).toMatch(/22px.*(240px|1fr).*80px.*60px.*240px.*96px.*96px.*32px/);
  });

  it("com Coccao Final: row label visivel, botao Adicionar NAO aparece", () => {
    const rowsWithCF = [baseRow, { /* CF row: stageCode === COCCAO_FINAL_CODE */ }];
    render(<FichaFlatGrid rows={rowsWithCF} /* ... */ />);
    expect(screen.getByText(/Coccao \/ Preparo Final/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adicionar Coccao Final/i })).not.toBeInTheDocument();
  });

  it("sem Coccao Final: botao Adicionar visivel, row label ausente", () => {
    render(<FichaFlatGrid rows={[baseRow]} /* sem CF */ />);
    expect(screen.queryByText(/Coccao \/ Preparo Final/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar Coccao Final/i })).toBeInTheDocument();
  });

  it("cf-row grid: 22px minmax(160px, auto) 128px 128px 96px 1fr 32px", () => { /* ... */ });
});
```

**B) Estender `tests/e2e/engineering-flow.spec.ts`**

Adicionar NO FINAL do spec (apos os testes existentes, nao substituir):

```ts
test("PDFV2-FICHA-07 — banner ingrediente em ficha semelhante", async ({ page }) => {
  const modalidadeName = "Bufe";
  const ingredientName = await uniqueName("Arroz branco Phase 8");

  // 1) Cria primeira ficha com modalidade X + ingrediente Y
  await page.goto("/fichas/nova");
  // preencher nome, selecionar modalidade, adicionar componente com ingredient Y
  // ... usar helpers selectMuiOption, fill, click "Salvar"
  const firstFichaName = await page.title(); // ou capturar pelo header

  // 2) Cria segunda ficha com mesma modalidade + mesmo ingrediente
  await page.goto("/fichas/nova");
  // selecionar modalidade X, adicionar componente com item Y
  // apos selecionar o item, aguardar banner
  await expect(page.getByText(/Este ingrediente ja aparece em/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("link", { name: new RegExp(firstFichaName, "i") })).toBeVisible();
});

test("PDFV2-FICHA-07 — banner NAO aparece se modalidade diferente", async ({ page }) => { /* negativo */ });
test("PDFV2-FICHA-07 — banner NAO aparece se item diferente", async ({ page }) => { /* negativo */ });
```

NOTA: adaptar seletores aos existentes no spec (usar os MESMOS helpers `selectMuiOption`,
`uniqueName`, padroes de navegacao do teste atual). NAO duplicar setup — usar `test.beforeEach`
existente se houver.

RED esperado: ambos os specs falham porque FichaFlatGrid pode ter `GRID_TEMPLATE` diferente e
a server action + hook + banner ainda nao existem.
  </action>
  <verify>
    <automated>mkdir -p .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts && npm run test:unit -- FichaFlatGrid 2>&1 | tee .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-ff-red.log && (grep -qE 'FAIL|failed' .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-ff-red.log || (echo 'ERROR: RED gate not reached — tests did not fail' && exit 1))</automated>
  </verify>
  <acceptance_criteria>
    - `src/tests/unit/engineering/FichaFlatGrid.test.tsx` existe com 4 `it(...)` blocos
    - `tests/e2e/engineering-flow.spec.ts` tem novo test "PDFV2-FICHA-07 — banner ingrediente em ficha semelhante" (+ 2 cenarios negativos)
    - `grep -c "Este ingrediente ja aparece em" tests/e2e/engineering-flow.spec.ts` >= 1
    - `grep -c "PDFV2-FICHA-07" tests/e2e/engineering-flow.spec.ts` >= 1
    - `npm run test:unit -- FichaFlatGrid` retorna pelo menos 1 FAIL (RED — GRID_TEMPLATE pode divergir)
  </acceptance_criteria>
  <done>Specs RED cobrindo re-validacao FichaFlatGrid + banner PDFV2-FICHA-07.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2 (GREEN): Implementar findFichasUsingItem + SimilarFichasBanner + hook em components-editor + ajustar FichaFlatGrid se necessario</name>
  <files>src/modules/engineering/server/ficha-similar-lookup.ts, src/modules/engineering/ui/SimilarFichasBanner.tsx, src/modules/engineering/ui/components-editor.tsx, src/modules/engineering/ui/FichaFlatGrid.tsx</files>
  <read_first>
    - src/modules/engineering/ui/FichaFlatGrid.tsx (integral — capturar GRID_TEMPLATE atual; confirmar cf-row grid)
    - src/modules/engineering/ui/components-editor.tsx (integral — localizar handler de select de item, entender prop modalidadeId + currentFichaId)
    - src/modules/catalog/server/catalog-repository.ts linhas 398-411 (pattern getPrismaClient + try/catch)
    - src/modules/engineering/server/engineering-repository.ts (padrao server action + Prisma query existente)
    - src/generated/prisma/client.ts (confirmar FichaStatus enum values)
    - update/tela-ficha-tecnica-v2.html linhas 224-354 (grid inline) + 356-379 (Coccao Final + botao)
    - src/tests/unit/engineering/FichaFlatGrid.test.tsx (criado Task 1)
  </read_first>
  <action>
**A) Criar `src/modules/engineering/server/ficha-similar-lookup.ts`**

Exatamente conforme sketch em `<interfaces>` acima. Copiar pattern de error-handling
`try { ... } catch { return []; }` do `getItemDetailWithPrisma` (catalog-repository.ts 398-411).

**Nota de seguranca — authz pre-resolvida (W-01):** Grep confirmou padrao do projeto:
- `src/modules/engineering/server/engineering-actions.ts` linha 5 importa `requirePermission` e linha 17 invoca `await requirePermission("ficha.write")` dentro de um helper `resolveFichaActor` no inicio de cada action.
- `src/modules/catalog/server/catalog-actions.ts` segue padrao paralelo: `resolveCatalogActor()` chama `await requirePermission("item.write")`.
- `ficha-similar-lookup.ts` e leitura (nao escrita) mas pertence ao modulo engineering. Para consistencia com o modulo e zero risco cross-tenant:

**DECISAO LOCK (option-A):** ADICIONAR como PRIMEIRA linha da `findFichasUsingItem`:
```ts
import { requirePermission } from "@/modules/access/server/authorization";
// ... dentro da funcao:
const actor = await requirePermission("ficha.read");
```
Se o scope `"ficha.read"` nao existir no authz helper, usar `"ficha.write"` (qualquer usuario que escreve ficha ja pode ler) — confirmar no executor lendo `src/modules/access/server/authorization.ts`. Actor retornado pode ser ignorado (nao usado no query) — o throw em caso de ausencia de sessao e o gate.

Threat T-08-05-01 passa de "accept pendente" para **mitigated**: toda chamada a `findFichasUsingItem` exige sessao autenticada com permissao de leitura de ficha. Sem PII no payload de retorno (Nome/Codigo/Modalidade), mas gate de autenticacao ainda e requerido por consistencia com as outras actions do modulo.

**B) Criar `src/modules/engineering/ui/SimilarFichasBanner.tsx`**

Conforme sketch em `<interfaces>`. Exportar `SimilarFicha` type e componente `SimilarFichasBanner`.
Usar MUI `Alert` + `Link`.

**C) Estender `src/modules/engineering/ui/components-editor.tsx` com hook**

1. Localizar a prop `modalidadeId` e `currentFichaId` (ou `ficha.id`) no componente. Se nao estao
   como props, puxa-los do state/context proprio do editor.

2. Adicionar state:
   ```ts
   const [similarFichas, setSimilarFichas] = useState<Record<string, SimilarFicha[]>>({});
   ```

3. Em cada `ComponentEditorRow` (ou no componente pai que renderiza a lista), adicionar useEffect
   disparado por mudanca de `row.itemComponenteId`:
   ```ts
   useEffect(() => {
     if (!row.itemComponenteId || !modalidadeId) return;
     let cancelled = false;
     findFichasUsingItem(row.itemComponenteId, currentFichaId ?? null, modalidadeId)
       .then(res => { if (!cancelled) setSimilarFichas(prev => ({ ...prev, [row.id]: res })); });
     return () => { cancelled = true; };
   }, [row.itemComponenteId, modalidadeId, currentFichaId]);
   ```

4. Renderizar `<SimilarFichasBanner fichas={similarFichas[row.id] ?? []} />` inline abaixo do
   row do componente (dentro do FichaFlatGrid cell apropriada, ou como linha extra no grid).

5. **NAO alterar** comportamento existente de flatten/group do FichaFlatGrid; apenas adicionar
   o banner.

**D) Re-validar `FichaFlatGrid.tsx` contra HTML tela-ficha-tecnica-v2.html**

Conferir o `GRID_TEMPLATE` atual. Se divergir do HTML (esperado: `22px minmax(240px, 1fr) 80px
60px 240px 96px 96px 32px`), ajustar para bater exatamente.

Similarmente para `CF_GRID_TEMPLATE`: esperado `22px minmax(160px, auto) 128px 128px 96px 1fr 32px`.

Se o botao "Adicionar Coccao Final" ja esta implementado (pendencias-v3 #15, commit c372bd4),
apenas confirmar que o componente `FichaFlatGrid` OU o componente pai (`components-editor.tsx`)
alterna visibility conforme presenca de `stageCode === COCCAO_FINAL_CODE` em rows. Se a logica
esta em outro lugar, localizar e registrar em SUMMARY.

**E) Rodar specs**:
```
npm run typecheck
npm run test:unit -- FichaFlatGrid
npm run test:e2e -- engineering-flow
```

Todos devem sair GREEN.
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:unit -- FichaFlatGrid && npm run test:e2e -- engineering-flow</automated>
  </verify>
  <acceptance_criteria>
    - `src/modules/engineering/server/ficha-similar-lookup.ts` existe e exporta `findFichasUsingItem`
    - `grep -c '"use server"' src/modules/engineering/server/ficha-similar-lookup.ts` >= 1
    - `grep -c 'FichaStatus.ativa\|FichaStatus.rascunho' src/modules/engineering/server/ficha-similar-lookup.ts` >= 1 (filtro D-13)
    - `grep -c 'componentes.*some.*itemComponenteId' src/modules/engineering/server/ficha-similar-lookup.ts` >= 1
    - `src/modules/engineering/ui/SimilarFichasBanner.tsx` existe e exporta `SimilarFichasBanner`
    - `grep -c 'Este ingrediente ja aparece em' src/modules/engineering/ui/SimilarFichasBanner.tsx` >= 1
    - `grep -c 'findFichasUsingItem' src/modules/engineering/ui/components-editor.tsx` >= 1
    - `grep -c 'SimilarFichasBanner' src/modules/engineering/ui/components-editor.tsx` >= 1
    - `npm run test:unit -- FichaFlatGrid` exits 0 (4 testes GREEN)
    - `npm run test:e2e -- engineering-flow` exits 0 (3 novos cenarios PDFV2-FICHA-07 GREEN + zero regressao nos existentes)
    - `npm run typecheck` exits 0
    - `.planning/REQUIREMENTS.md` marca `PDFV2-FICHA-07` como Complete na tabela Traceability
  </acceptance_criteria>
  <done>findFichasUsingItem + SimilarFichasBanner + hook implementados; FichaFlatGrid re-validado; PDFV2-FICHA-07 fechado.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client (components-editor) -> server action findFichasUsingItem -> Prisma | Query envia itemComponenteId e modalidadeId vindos do cliente |
| Server action -> DB read-only | Apenas SELECT; nao escreve |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-05-01 | Info Disclosure | findFichasUsingItem pode vazar fichas de outro estabelecimento se sem authz | mitigate | W-01 resolvido: `await requirePermission("ficha.read")` como primeira linha da action (padrao do modulo engineering — ver engineering-actions.ts:17). Prisma query filtra por modalidadeId; tenant scoping herdado do padrao existente do modulo (verificar e replicar em SUMMARY). |
| T-08-05-02 | Tampering | itemComponenteId arbitrario injetado via DevTools | accept | Query so le; pior caso o usuario descobre que outra ficha usa mesmo item — info ja disponivel pela grade de fichas. Baixo impacto. |
| T-08-05-03 | DoS | N requests concorrentes de findFichasUsingItem ao digitar | mitigate | Hook useEffect dispara so em mudanca de `row.itemComponenteId` (nao em cada keystroke); `take: 5` no Prisma limita payload; debounce nao necessario dado granularidade. |
| T-08-05-04 | SQL Injection | Prisma parameterized query | accept | Prisma Client sempre binda parametros; zero string concatenation no query. |
| T-08-05-05 | Repudiation | banner e visibilidade de fichas sem audit log | accept | Info consultiva, nao altera dados; self-hosted sem requisito de audit de leitura. |
</threat_model>

<verification>
- `npm run typecheck` exits 0
- `npm run test:unit -- FichaFlatGrid` exits 0
- `npm run test:unit -- engineering` exits 0 (suite engineering sem regressao)
- `npm run test:e2e -- engineering-flow` exits 0 (cenarios novos PDFV2-FICHA-07 + existentes)
- Visual smoke: criar 2 fichas mesma modalidade com mesmo ingrediente; banner aparece na segunda; criar 3a com modalidade diferente, banner nao aparece.
- `.planning/REQUIREMENTS.md` atualizado
</verification>

<success_criteria>
1. FichaFlatGrid GRID_TEMPLATE + CF_GRID_TEMPLATE batem HTML aprovado (confirmado ou ajustado).
2. Botao "Adicionar Coccao Final" alterna corretamente com presenca da row CF (mantem comportamento pendencias-v3 #15).
3. Server action `findFichasUsingItem` com criterio mesma modalidade + mesmo itemComponenteId + status in (ativa, rascunho).
4. Componente `SimilarFichasBanner` renderiza Alert inline com Link para ficha encontrada; nao bloqueante.
5. Hook em components-editor dispara lookup em mudanca de itemComponenteId e propaga para banner.
6. PDFV2-FICHA-07 marcado como Complete em REQUIREMENTS.md.
7. Zero regressao em engineering-flow existente + novos cenarios GREEN.
</success_criteria>

<output>
Apos completar, criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-05-ficha-fidelidade-banner-SUMMARY.md`
</output>
</content>
</invoke>