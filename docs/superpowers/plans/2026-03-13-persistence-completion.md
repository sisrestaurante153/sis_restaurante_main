# Persistencia Real E Fechamento De Qualidade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar os fluxos operacionais centrais do modo demo para PostgreSQL com Prisma e fechar a cobertura obrigatória de testes, seed e documentação operacional.

**Architecture:** A UI mantém os contratos atuais, enquanto os repositórios passam a resolver leituras e escritas via Prisma. O motor de custo existente continua centralizado no backend e passa a ser disparado pelos casos de uso de item e ficha, persistindo snapshots, impacto e dependências transitivas.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, Vitest, Playwright, Docker Compose.

---

## Chunk 1: Testes De Persistencia

### Task 1: Cobertura de integração do banco

**Files:**
- Create: `src/tests/integration/helpers/prisma-test-env.ts`
- Create: `src/tests/integration/catalog-prisma.test.ts`
- Create: `src/tests/integration/engineering-prisma.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] Escrever testes falhando para cadastro de item, criação/edição de ficha, recálculo em cascata e leitura de composição/custos.
- [ ] Rodar apenas os testes de integração e validar falha pelos caminhos ainda em memória.
- [ ] Implementar apenas o mínimo necessário para começar a atender os cenários.
- [ ] Rodar novamente até verde.

### Task 2: Cobertura e2e obrigatória

**Files:**
- Create: `tests/e2e/engineering-flow.spec.ts`
- Modify: `playwright.config.ts`

- [ ] Escrever o fluxo completo obrigatório com login, item, ficha, intermediário, embalagem, custo, alteração de preço, cascata, árvore expandida, busca e inativação.
- [ ] Rodar o spec novo e capturar as falhas reais da UI atual.
- [ ] Ajustar a implementação até o fluxo ficar verde.

## Chunk 2: Repositórios Prisma

### Task 3: Persistência do catálogo

**Files:**
- Modify: `src/modules/catalog/server/catalog-repository.ts`
- Create: `src/modules/catalog/server/catalog-prisma-mappers.ts`

- [ ] Priorizar Prisma em `listItems`, `getItemDetail`, `listItemOptions` e `saveItem`.
- [ ] Normalizar unidades, fornecedor, compra e conversões.
- [ ] Disparar recálculo/auditoria quando o custo-base mudar.

### Task 4: Persistência da engenharia

**Files:**
- Modify: `src/modules/engineering/server/engineering-repository.ts`
- Modify: `src/modules/engineering/server/engineering-actions.ts`
- Modify: `src/modules/engineering/server/cost-engine-service.ts`

- [ ] Salvar fichas, componentes, versionamento e status ativo/inativo com Prisma.
- [ ] Rebuild de dependências e bloqueio de ciclo antes de ativar/salvar ficha.
- [ ] Persistir snapshots e expor composição expandida, custos resumidos e detalhe da ficha.

### Task 5: Pendencias e auditoria

**Files:**
- Modify: `src/modules/import/server/import-repository.ts`
- Modify: `src/modules/audit/server/audit-service.ts`
- Modify: `src/modules/audit/server/audit-repository.ts`

- [ ] Ler pendências de importação do banco.
- [ ] Melhorar leitura da auditoria para exibir rótulos úteis a partir do payload persistido.

## Chunk 3: Operação Local E Evidência

### Task 6: Seed e reset local

**Files:**
- Modify: `prisma/seed.ts`
- Create: `scripts/reset-local-env.sh`
- Modify: `package.json`

- [ ] Expandir a massa de dados para a cadeia completa e conflitos de importação.
- [ ] Criar reset local idempotente com compose, migrate reset e seed.
- [ ] Validar bootstrap local do zero.

### Task 7: Documentação final

**Files:**
- Modify: `README.md`
- Create: `docs/qa/homologation-checklist.md`
- Create: `docs/qa/coverage-and-risks.md`

- [ ] Documentar o novo fluxo local, integração com banco, smoke obrigatório e limites conhecidos.
- [ ] Registrar checklist de homologação e relatório final de cobertura/riscos.
