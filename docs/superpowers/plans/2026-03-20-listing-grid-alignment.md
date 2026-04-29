# Listing Grid Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar a geometria interna das listagens principais para que cabecalhos e celulas compartilhem a mesma regua vertical em desktop e mobile.

**Architecture:** A implementacao cria um padrao compartilhado para `DataGrid`, com estilos base e wrappers internos reutilizaveis para texto empilhado, `Chip` e valores numericos. Em seguida, esse padrao substitui os blocos locais repetidos em `Itens`, `Fichas` e `Pendencias`, mantendo o comportamento atual de filtros, paginação, scroll horizontal e interacao.

**Tech Stack:** Next.js 15, React 19, TypeScript, MUI, MUI X Data Grid, Vitest, Playwright

---

### Task 1: Criar o padrao compartilhado de geometria para DataGrid

**Files:**
- Create: `src/components/ui/data-grid-pattern.tsx`
- Reference: `src/modules/catalog/ui/items-listing-view.tsx`
- Reference: `src/modules/engineering/ui/fichas-listing-view.tsx`
- Reference: `src/modules/import/ui/pending-conflicts-list.tsx`

- [ ] **Step 1: Write the failing test**

Criar ou ajustar um teste de componente simples que valide a presenca de wrappers compartilhados para:
- celula com texto empilhado
- celula centralizada para `Chip`
- celula numerica alinhada a direita

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/app-data-grid-pattern.test.tsx`
Expected: FAIL porque o padrao compartilhado ainda nao existe.

- [ ] **Step 3: Write minimal implementation**

Implementar o modulo compartilhado contendo:
- `listingDataGridSx`
- helpers de alinhamento para coluna a esquerda, centro e direita
- wrappers reutilizaveis como `StackedCell`, `CenteredCell`, `NumericCell`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/app-data-grid-pattern.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/data-grid-pattern.tsx src/tests/unit/app-data-grid-pattern.test.tsx
git commit -m "feat: add shared listing data grid pattern"
```

### Task 2: Aplicar o padrao em Itens

**Files:**
- Modify: `src/modules/catalog/ui/items-listing-view.tsx`
- Modify: `src/tests/unit/items-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Expandir o teste de `Itens` para verificar que:
- a linha principal usa o wrapper padronizado
- o valor monetario continua alinhado a direita
- a coluna com `Chip` segue o container central compartilhado

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/items-page.test.tsx`
Expected: FAIL porque a listagem ainda usa wrappers locais.

- [ ] **Step 3: Write minimal implementation**

Substituir os wrappers locais das colunas de `Itens` pelo padrao compartilhado e aplicar o `sx` centralizado do novo modulo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/items-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/catalog/ui/items-listing-view.tsx src/tests/unit/items-page.test.tsx
git commit -m "feat: align item listing grid"
```

### Task 3: Aplicar o padrao em Fichas

**Files:**
- Modify: `src/modules/engineering/ui/fichas-listing-view.tsx`
- Modify: `src/tests/unit/fichas-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Expandir o teste de `Fichas` para verificar:
- wrapper empilhado na coluna principal
- `Chip` de status encaixado no container compartilhado
- custo alinhado pela mesma regua da coluna numerica

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/fichas-page.test.tsx`
Expected: FAIL porque a grade ainda usa a geometria local.

- [ ] **Step 3: Write minimal implementation**

Aplicar o padrao compartilhado na listagem de `Fichas`, preservando tooltip de atualizacao, status e navegação por clique na linha.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/fichas-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/engineering/ui/fichas-listing-view.tsx src/tests/unit/fichas-page.test.tsx
git commit -m "feat: align ficha listing grid"
```

### Task 4: Reaplicar o padrao em Pendencias e demais grades principais

**Files:**
- Modify: `src/modules/import/ui/pending-conflicts-list.tsx`
- Modify: `src/modules/engineering/ui/IngredienteDataGrid.tsx`
- Modify: `src/tests/unit/import-pending-page.test.tsx`
- Modify: `src/tests/unit/components-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

Adicionar expectativas nos testes existentes para garantir que:
- `Pendencias` usa o mesmo bloco de alinhamento base
- `IngredienteDataGrid` herda o mesmo `sx` estrutural, quando aplicavel

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/import-pending-page.test.tsx src/tests/unit/components-editor.test.tsx`
Expected: FAIL porque as grades ainda nao consomem o padrao compartilhado.

- [ ] **Step 3: Write minimal implementation**

Substituir estilos repetidos pelo padrao compartilhado nos grids restantes do escopo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/import-pending-page.test.tsx src/tests/unit/components-editor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/import/ui/pending-conflicts-list.tsx src/modules/engineering/ui/IngredienteDataGrid.tsx src/tests/unit/import-pending-page.test.tsx src/tests/unit/components-editor.test.tsx
git commit -m "feat: align shared operational data grids"
```

### Task 5: Verificar no browser em desktop e mobile

**Files:**
- Verify only: `src/modules/catalog/ui/items-listing-view.tsx`
- Verify only: `src/modules/engineering/ui/fichas-listing-view.tsx`
- Verify only: `src/modules/import/ui/pending-conflicts-list.tsx`

- [ ] **Step 1: Run focused unit suite**

Run: `npx vitest run src/tests/unit/app-data-grid-pattern.test.tsx src/tests/unit/items-page.test.tsx src/tests/unit/fichas-page.test.tsx src/tests/unit/import-pending-page.test.tsx src/tests/unit/components-editor.test.tsx`
Expected: PASS

- [ ] **Step 2: Verify desktop in browser**

Abrir `http://127.0.0.1:3000/itens`, `http://127.0.0.1:3000/fichas` e `http://127.0.0.1:3000/importacao/pendencias` com viewport desktop e confirmar que cabecalhos e celulas compartilham a mesma regua vertical.

- [ ] **Step 3: Verify mobile in browser**

Repetir a verificacao com viewport mobile, mantendo scroll horizontal quando necessario, sem quebrar a ancora visual das colunas.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/data-grid-pattern.tsx src/modules/catalog/ui/items-listing-view.tsx src/modules/engineering/ui/fichas-listing-view.tsx src/modules/import/ui/pending-conflicts-list.tsx src/modules/engineering/ui/IngredienteDataGrid.tsx src/tests/unit/app-data-grid-pattern.test.tsx src/tests/unit/items-page.test.tsx src/tests/unit/fichas-page.test.tsx src/tests/unit/import-pending-page.test.tsx src/tests/unit/components-editor.test.tsx
git commit -m "feat: standardize listing grid alignment"
```
