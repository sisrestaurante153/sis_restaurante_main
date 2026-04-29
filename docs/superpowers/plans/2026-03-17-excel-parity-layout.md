# Excel Parity Layout Implementation Plan

## Status atual

O cliente validou o layout implementado da ficha técnica. A partir deste ponto, esta anatomia passa a ser tratada como baseline oficial do produto.

Consequências desta validação:

- novas mudanças visuais na ficha devem preservar esta estrutura;
- placeholders comerciais continuam aceitos nesta fase;
- a próxima evolução funcional da ficha não deve redesenhar a experiência aprovada.

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar a experiência de ficha técnica com a estrutura e a ordem operacional do Excel legado, eliminando a divergência entre fichas e montagem.

**Architecture:** A implementação manterá o domínio canônico e o cálculo no backend, mas substituirá a organização atual da UI por uma ficha única baseada no superset de campos do Excel. A rota de montagem será rebaixada para entrada filtrada da mesma experiência, e os componentes de formulário passarão a refletir grupos e etapas operacionais do legado.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Vitest, Playwright.

---

## Chunk 1: Gap analysis e contratos da UI

### Task 1: Fixar a estrutura alvo da ficha única

**Files:**
- Modify: `docs/superpowers/specs/2026-03-17-excel-parity-layout-design.md`
- Modify: `src/modules/engineering/server/engineering-repository.ts`
- Modify: `src/modules/engineering/server/ficha-form-schema.ts`
- Test: `src/tests/unit/ficha-form-schema.test.ts`

- [ ] Revisar a planilha legada e mapear a ficha mais completa para um inventário fechado de grupos e campos.
- [ ] Comparar esse inventário com o payload atual de ficha e listar campos já cobertos vs. lacunas.
- [ ] Atualizar o schema do formulário para suportar explicitamente todos os campos necessários do layout final.
- [ ] Escrever ou ajustar testes unitários do parse para garantir que fichas simples e completas aceitem o mesmo shape base.

## Chunk 2: Ficha única e ordem do Excel

### Task 2: Reorganizar a tela de ficha para paridade estrutural

**Files:**
- Modify: `src/modules/engineering/ui/ficha-form.tsx`
- Modify: `src/modules/engineering/ui/components-editor.tsx`
- Modify: `src/app/(app)/fichas/[fichaId]/page.tsx`
- Modify: `src/app/(app)/fichas/nova/page.tsx`
- Test: `src/tests/unit/workspace-layout.test.tsx`

- [ ] Remover a organização atual baseada só em “etapa 1/2/3/4” e substituir por blocos na ordem do Excel.
- [ ] Garantir que a ficha mais simples e a mais completa usem o mesmo layout base, com seções vazias colapsáveis em vez de experiências diferentes.
- [ ] Expor no editor todos os campos de processo necessários, incluindo fator de correção, índice de cocção e perda de forma consistente.
- [ ] Ajustar o painel lateral para mostrar a cascata de custo e rendimento conforme a leitura operacional do cliente.
- [ ] Validar responsividade sem quebrar a leitura sequencial da ficha.

## Chunk 3: Montagem como derivação da ficha

### Task 3: Eliminar a divergência entre `fichas` e `montagem`

**Files:**
- Modify: `src/app/(app)/montagem/page.tsx`
- Modify: `src/modules/engineering/ui/assembly-workbench.tsx`
- Modify: `src/modules/platform/ui/sidebar-nav.tsx`
- Test: `tests/e2e/engineering-flow.spec.ts`

- [ ] Transformar a página de montagem em atalho, filtro ou redirecionamento para a ficha canônica dos itens finais.
- [ ] Remover qualquer texto ou estrutura que sugira um editor diferente para prato, marmita ou combo.
- [ ] Atualizar a navegação lateral para reforçar a ficha técnica como centro da operação.
- [ ] Ajustar o E2E principal para abrir e editar itens finais pela experiência única.

## Chunk 4: Biblioteca por grupo e validação final

### Task 4: Implementar grupos operacionais e validar a aderência ao Excel

**Files:**
- Modify: `src/modules/engineering/ui/components-editor.tsx`
- Modify: `src/app/(app)/fichas/page.tsx`
- Modify: `src/modules/engineering/ui/ficha-list.tsx`
- Test: `src/tests/unit/ficha-form-schema.test.ts`
- Test: `tests/e2e/engineering-flow.spec.ts`

- [ ] Introduzir a seleção de componentes por grupo sem quebrar a árvore única de custo.
- [ ] Garantir suporte explícito a grupos como descartáveis, embalagem e apoio dentro da mesma ficha.
- [ ] Validar com testes que o fluxo continua cobrindo cascata, custo e persistência após a reorganização visual.
- [ ] Rodar `npm run test:unit`, `npm run test:e2e` e uma revisão manual guiada pela planilha legada antes de apresentar novamente ao cliente.
