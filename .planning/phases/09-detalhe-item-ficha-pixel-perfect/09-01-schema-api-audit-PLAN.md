---
plan_id: 09-01
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md
  - src/modules/engineering/server/engineering-actions.ts
  - src/modules/engineering/server/ficha-form-schema.ts
autonomous: true
requirements:
  - SPEC-DB-API-ALINHAMENTO
tags: [schema-audit, zod, prisma, ficha, item]

must_haves:
  truths:
    - "Todos os campos exibidos em update/tela-item-v1.html existem no schema Prisma, Zod e presenter"
    - "Todos os campos exibidos em update/tela-ficha-tecnica-v2.html existem no schema Prisma, Zod e presenter"
    - "preparationMode aceita string vazia (opcional) sem erro Zod"
    - "09-VERIFICATION.md §Schema declara explicitamente 'Phase 9 = zero Prisma migration' OU registra migration aplicada 2x idempotente"
  artifacts:
    - path: ".planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md"
      provides: "Tabela HTML <-> Prisma <-> Zod <-> presenter com status COBERTO/GAP/DRIFT por campo"
      contains: "| Campo HTML | Prisma | Zod | Presenter | Status |"
    - path: ".planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md"
      provides: "Secao §Schema com resultado da auditoria e declaracao de zero migration"
      contains: "Phase 9 = zero Prisma migration"
    - path: "src/modules/engineering/server/ficha-form-schema.ts"
      provides: "Zod preparationMode optional com default ''"
      contains: "preparationMode"
  key_links:
    - from: "src/modules/engineering/server/engineering-actions.ts"
      to: "ficha-form-schema"
      via: "parseFichaFormData"
      pattern: "parseFichaFormData"
---

<objective>
Auditoria formal de fidelidade entre os HTMLs aprovados (update/tela-item-v1.html e update/tela-ficha-tecnica-v2.html) e o modelo atual (Prisma schema, Zod schemas, presenter/mapper, server actions). Relaxar Zod preparationMode para aceitar string vazia (D-10). Declarar formalmente "Phase 9 = zero Prisma migration" em 09-VERIFICATION.md §Schema (D-12). Caso a auditoria encontre um gap real, gerar migration idempotente aplicada 2x [BLOCKING].

Purpose: Satisfazer goal #2 e #3 da Phase 9 ("todos os campos existem no schema" + "migracoes idempotentes sem perda"); destravar as waves 2/3 (UI + testes) com contrato backend estavel.
Output: 09-01-SUMMARY.md com tabela auditoria; Zod relaxado; 09-VERIFICATION.md secao §Schema criada.
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
@.planning/REQUIREMENTS.md
@update/tela-item-v1.html
@update/tela-ficha-tecnica-v2.html
@prisma/schema.prisma
@src/modules/engineering/server/ficha-form-schema.ts
@src/modules/engineering/server/engineering-actions.ts
@src/modules/catalog/server/catalog-item-schema.ts
@src/modules/engineering/server/engineering-repository.ts
@src/modules/catalog/server/catalog-repository.ts

<interfaces>
<!-- Zod schema alvo (D-10): relax preparationMode -->
Current (hypothetical): `preparationMode: z.string().min(1)` (obrigatorio)
Target: `preparationMode: z.string().default('')` (opcional com default '')

<!-- Tabela alvo do SUMMARY (markdown) -->
| Area | Campo HTML | Linha HTML | Prisma | Zod | Presenter | Status |
|------|-----------|------------|--------|-----|-----------|--------|
| Item Identificacao | Codigo | 186 | Item.code | itemFormSchema.code | mapItemDetail.code | COBERTO |
| Item Identificacao | Nome do item | 192 | Item.name | itemFormSchema.name | mapItemDetail.name | COBERTO |
| Item Fornecedor 1 | Fornecedor | 252 | ItemCompra.fornecedorNome | purchasesSchema.supplierName | mapItemDetail.purchases | COBERTO |
| Item Fornecedor 1 | Unidade de compra | 257 | ItemCompra.unidadeCompra | purchasesSchema.purchaseUnit | ... | COBERTO |
| Ficha Identificacao | Cod. | 255 (HTML v2) | Ficha.codigo | fichaFormSchema.code (implicito) | mapFichaDetail.code | COBERTO ou GAP (a validar) |
| Ficha Finalizacao | Modo de preparo | 427 | Ficha.preparationMode | fichaFormSchema.preparationMode.min(1) | mapFichaDetail.preparationMode | DRIFT (Zod obrigatorio vs HTML opcional) -> D-10 |
</interfaces>

<!-- Nenhum plano anterior nesta fase: 09-01 e Wave 1 solo. -->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Auditoria HTML <-> Prisma <-> Zod <-> Presenter (ambas telas)</name>
  <files>.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md</files>
  <read_first>
    - update/tela-item-v1.html (leia linhas 178-381 — Identificacao, Detalhamento Fornecedor, Observacoes)
    - update/tela-ficha-tecnica-v2.html (leia linhas 253-432 — Identificacao, Estrutura, Montagem, Finalizacao)
    - prisma/schema.prisma (modelos Item, ItemCompra, Ficha, FichaEtapa, FichaComponente, Modalidade, UnidadeMedida)
    - src/modules/engineering/server/ficha-form-schema.ts
    - src/modules/catalog/server/catalog-item-schema.ts (ou catalog-actions.ts se schema inline)
    - src/modules/engineering/server/engineering-repository.ts (mapFichaDetail / presenter)
    - src/modules/catalog/server/catalog-repository.ts (mapItemDetail / presenter)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-09..D-12
  </read_first>
  <action>
    Criar `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md` com:

    1. **Cabecalho YAML frontmatter**: plan_id=09-01, phase=09-detalhe-item-ficha-pixel-perfect, executor=<agent>, date=<ISO>, status=complete.

    2. **Secao ## Auditoria Item (update/tela-item-v1.html)** — tabela markdown exata:
       | Campo HTML | Linha HTML | Prisma (modelo.campo) | Zod (schema.campo) | Presenter (mapper) | Status |
       |------------|------------|----------------------|---------------------|---------------------|--------|
       Popular TODAS as linhas dos 3 blocos do HTML Item:
       - Bloco Identificacao: Codigo (186), Nome (192), Status (213), Tipo (199), Categoria operacional (206).
       - Bloco Fornecedor 1 Principal (252-300): Fornecedor, Unidade de compra, Quantidade de compra, Preco de compra, Atualizado em (priceUpdatedAt), Unidade de uso, Quantidade de uso, Fator de conversao (calc), Preco de uso (calc).
       - Bloco Fornecedor 2 fixado (302-360): mesmos campos com flag `usageIsFixedFromPrimary=true`.
       - Bloco Observacoes (374-381): Descricao operacional (opcional).
       Status = COBERTO | GAP | DRIFT (com nota explicando).

    3. **Secao ## Auditoria Ficha (update/tela-ficha-tecnica-v2.html)** — mesma tabela:
       - Identificacao g-id1 (255-260): Cod., Produto, Data de criacao, Data e hora da ultima alteracao.
       - Identificacao g-id2 (261-268): Modalidade, Grupo operacional, Status, Custo atual da ficha (derivado).
       - Estrutura da Ficha: etapas (FichaEtapa), componentes (FichaComponente), FC/IC, drag-reorder (ordem).
       - Montagem: item-row com TipoEtapa.
       - Finalizacao (425-432): Modo de preparo (opcional), Observacoes gerais (opcional).
       - Quadro Final (435-578): rendimento, unidade, FC, IC, custo real, CMV, preco venda, despesas, margem, contribuicao.

    4. **Secao ## Gaps Encontrados**:
       - Se `Status=COBERTO` para TODAS as linhas → registrar "Nenhum gap — Phase 9 = zero Prisma migration confirmado".
       - Se houver GAP/DRIFT → listar cada um com decisao (mitigar via Zod relax | migration | presenter fix).
       - DRIFT esperado conhecido: `fichaFormSchema.preparationMode` obrigatorio vs HTML marca opcional → ver Task 2 (D-10).

    5. **Secao ## Decisao Final**:
       - "Phase 9 = zero Prisma migration" OU
       - "Phase 9 = 1 migration gerada: {nome}" com pointer para Task 3 [BLOCKING].

    Formato exato das linhas da tabela deve mostrar hex-precision: se Prisma não tem o campo, escrever `AUSENTE` (nao em branco). Se Zod nao tem regra, escrever `—`.
  </action>
  <verify>
    <automated>test -f .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md &amp;&amp; grep -c "| " .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md | awk '{ if ($1 &gt;= 20) exit 0; else exit 1 }'</automated>
  </verify>
  <acceptance_criteria>
    - File `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md` exists
    - Contains line `## Auditoria Item (update/tela-item-v1.html)` (grep literal)
    - Contains line `## Auditoria Ficha (update/tela-ficha-tecnica-v2.html)` (grep literal)
    - Contains line `## Gaps Encontrados` (grep literal)
    - Contains line `## Decisao Final` (grep literal)
    - Contains at least one of: `Phase 9 = zero Prisma migration` OR `Phase 9 = 1 migration gerada`
    - Tabela Item lista pelo menos: `Codigo`, `Nome`, `Status`, `Tipo`, `Categoria`, `Fornecedor`, `Unidade de compra`, `Quantidade de compra`, `Preco de compra`, `Atualizado em`, `Unidade de uso`, `Quantidade de uso`, `Fator de conversao`, `Preco de uso`, `Descricao operacional` (grep each)
    - Tabela Ficha lista pelo menos: `Cod.`, `Produto`, `Data de criacao`, `Data e hora da ultima alteracao`, `Modalidade`, `Grupo operacional`, `Status`, `Custo atual`, `Modo de preparo`, `Observacoes` (grep each)
  </acceptance_criteria>
  <done>
    Tabela de auditoria entregue, status por campo declarado, decisao final de migration explicita.
  </done>
</task>

<task type="auto">
  <name>Task 2: Relaxar Zod preparationMode para optional com default '' (D-10)</name>
  <files>src/modules/engineering/server/ficha-form-schema.ts, src/modules/engineering/server/engineering-actions.ts</files>
  <read_first>
    - src/modules/engineering/server/ficha-form-schema.ts (localizar a declaracao atual de preparationMode)
    - src/modules/engineering/server/engineering-actions.ts (entender consumo via parseFichaFormData)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-10 (Zod preparationMode optional default '')
    - update/tela-ficha-tecnica-v2.html linha 427 (campo Modo de preparo sem marca `required`)
    - Task 1 SUMMARY (verificar que DRIFT preparationMode esta listado)
  </read_first>
  <action>
    No arquivo `src/modules/engineering/server/ficha-form-schema.ts`, localizar a declaracao Zod de `preparationMode`. Estado atual esperado:

    ```ts
    preparationMode: z.string().min(1, "Informe o modo de preparo")
    ```

    Substituir por:

    ```ts
    preparationMode: z.string().default("")
    ```

    Nao tornar a coluna Prisma nullable (per D-10: preserva NOT NULL com default `''` no lado app, menor blast radius, zero migration).

    Verificar consumers:
    - `engineering-actions.ts` parseFichaFormData consome resultado — nenhum change esperado.
    - Se houver testes unit legados que assertam erro quando preparationMode vazio (ex.: `expect(result.errors.preparationMode).toBeDefined()` com input vazio), atualizar expectativa para `.success === true` e `.data.preparationMode === ""`.

    Procurar por tests afetados:
    ```bash
    grep -rn "preparationMode" src/modules/engineering/ tests/ 2>&1
    ```

    Ajustar todos os testes que dependam do comportamento antigo.

    Typecheck:
    ```bash
    npm run typecheck
    ```

    Unit tests:
    ```bash
    npm run test:unit -- ficha-form-schema
    npm run test:unit -- engineering-actions
    ```

    Ambos devem passar.
  </action>
  <verify>
    <automated>grep -n "preparationMode: z.string().default(\"\")" src/modules/engineering/server/ficha-form-schema.ts &amp;&amp; npm run typecheck &amp;&amp; npm run test:unit -- ficha-form-schema</automated>
  </verify>
  <acceptance_criteria>
    - `src/modules/engineering/server/ficha-form-schema.ts` contains literal string `preparationMode: z.string().default("")` (grep-verifiable)
    - `src/modules/engineering/server/ficha-form-schema.ts` does NOT contain `preparationMode: z.string().min(1` (grep — zero matches)
    - `npm run typecheck` exits 0
    - `npm run test:unit -- ficha-form-schema` exits 0
    - `npm run test:unit -- engineering-actions` exits 0
    - prisma/schema.prisma `Ficha.preparationMode` permanece NOT NULL (nao alterado) — grep `preparationMode` em schema.prisma nao deve conter `?` ou `@default(null)`
  </acceptance_criteria>
  <done>
    Zod preparationMode aceita string vazia sem erro; testes legados adaptados; typecheck clean.
  </done>
</task>

<task type="auto">
  <name>Task 3: VERIFICATION.md §Schema + declaracao zero migration (ou BLOCKING migration se gap real)</name>
  <files>.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md (Task 1 output — secao Decisao Final)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md (formato de referencia)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-12
  </read_first>
  <action>
    Criar `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md` com seguintes secoes (iniciar estrutura — secoes de UI/tests serao preenchidas em 09-05):

    ```markdown
    # Phase 9 VERIFICATION

    Last updated: <ISO date>
    Status: in-progress (09-01 complete)

    ## §1 Schema Audit (from 09-01)

    **Decisao formal:** Phase 9 = zero Prisma migration.
    (OU, se gap encontrado: Phase 9 = 1 migration gerada: `prisma/migrations/{timestamp}_{nome}/migration.sql`, aplicada 2x via `docker compose run --rm migrate` com idempotencia confirmada.)

    Auditoria completa em `09-01-schema-api-audit-SUMMARY.md`.

    Resumo:
    - Item (update/tela-item-v1.html): {N} campos auditados, 0 GAP, {M} DRIFT mitigados via {Zod relax | presenter derivation}.
    - Ficha (update/tela-ficha-tecnica-v2.html): {N} campos auditados, 0 GAP, 1 DRIFT mitigado (preparationMode: Zod relax D-10).

    ## §2 Zod Contracts

    - `preparationMode: z.string().default("")` (D-10 — 09-01 Task 2)
    - Tests verdes: `npm run test:unit -- ficha-form-schema`

    ## §3 UI Pixel-Perfect (to be populated by 09-02, 09-03, 09-04)

    _Pending waves 2/3._

    ## §4 E2E Pixel-Perfect Tests (to be populated by 09-05)

    _Pending wave 3._

    ## §5 Release Scaffold (to be populated by 09-05)

    _Pending wave 3._
    ```

    **Se** Task 1 identificou gap real E criou migration em Task 3-alt (ver ramificacao abaixo):

    Ramificacao [BLOCKING] — somente se auditoria encontrou gap:
    1. Gerar migration idempotente: `prisma migrate dev --name {slug} --create-only` + editar SQL com `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `pg_constraint DO $$ END $$` guards.
    2. Aplicar 2x: `docker compose run --rm migrate` (primeira: aplica; segunda: nao reaplica, exit 0 idempotente).
    3. Registrar evidencia em 09-VERIFICATION.md §1 com commit SHAs da migration e logs de ambas execucoes.

    Caso base (auditoria sem gap): apenas registrar "zero migration" — sem migration gerada.
  </action>
  <verify>
    <automated>test -f .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md &amp;&amp; grep -E "(Phase 9 = zero Prisma migration|Phase 9 = 1 migration gerada)" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md &amp;&amp; grep "§1 Schema Audit" .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md</automated>
  </verify>
  <acceptance_criteria>
    - File `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md` exists
    - Contains `## §1 Schema Audit` (grep literal)
    - Contains `## §2 Zod Contracts` (grep literal)
    - Contains `## §3 UI Pixel-Perfect` (grep literal)
    - Contains `## §4 E2E Pixel-Perfect Tests` (grep literal)
    - Contains `## §5 Release Scaffold` (grep literal)
    - Contains literal `Phase 9 = zero Prisma migration` OR `Phase 9 = 1 migration gerada`
    - Referencia `09-01-schema-api-audit-SUMMARY.md` explicitamente (grep)
    - Se migration foi criada: `prisma/migrations/` contem novo diretorio + `docker compose run --rm migrate` logs anexados em docs/qa/ OU citados inline
  </acceptance_criteria>
  <done>
    09-VERIFICATION.md §1 e §2 populados; declaracao formal de zero migration (ou migration idempotente aplicada 2x registrada).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Form submit → server action | FormData cliente parseada via Zod em engineering-actions.ts |
| DB schema migrations | Idempotencia + backup obrigatorios se migration for gerada |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-01-01 | Tampering | Zod preparationMode relax | mitigate | Default `''` no schema Zod (nao no DB); coluna Prisma permanece NOT NULL; blast radius limitado a UI opcional |
| T-09-01-02 | Denial of Service | Migration idempotency | mitigate | Se gap real aparecer: `ADD COLUMN IF NOT EXISTS` + `pg_constraint DO $$` guards; `docker compose run --rm migrate` executada 2x validando idempotencia |
| T-09-01-03 | Information Disclosure | Audit SUMMARY tabela | accept | Tabela lista apenas nomes de campos/modelos; sem dados de cliente; arquivo interno `.planning/` |
</threat_model>

<verification>
- Tabela de auditoria completa com status COBERTO/GAP/DRIFT por campo
- Zod preparationMode aceita string vazia sem erro
- Typecheck + unit tests verdes
- 09-VERIFICATION.md §Schema declara formalmente zero migration OU registra migration idempotente 2x
- `npm run test:e2e -- engineering-flow --workers=1` nao regrede (gate D-20)
</verification>

<success_criteria>
1. Auditoria formal entregue em 09-01-SUMMARY.md cobrindo todos os campos dos dois HTMLs (Item + Ficha) com status por campo.
2. Zod preparationMode aceita string vazia: `parseFichaFormData({ ..., preparationMode: '' }).success === true`.
3. 09-VERIFICATION.md §1 declara "Phase 9 = zero Prisma migration" OU registra migration idempotente 2x aplicada.
4. Typecheck + test:unit + test:e2e subset estavel verdes.
5. Nao quebra contratos downstream: ficha-form.tsx, engineering-actions.ts, engineering-repository.ts continuam funcionais.
</success_criteria>

<output>
After completion, create `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md` documenting:
- Auditoria executada (links para 09-01-schema-api-audit-SUMMARY.md)
- Zod change (diff preparationMode)
- Decisao final (zero migration ou migration aplicada)
- Gates passados (typecheck + unit + e2e subset)
- Ramificacoes para waves 2/3 desbloqueadas
</output>
