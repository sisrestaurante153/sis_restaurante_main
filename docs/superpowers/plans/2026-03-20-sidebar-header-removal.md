# Sidebar Header Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o cabecalho expandido da sidebar para deixar a navegacao iniciar logo abaixo do controle lateral.

**Architecture:** A mudanca fica concentrada em `AppShellClient`, sem alterar a estrutura de rotas nem a lista de navegacao. Um teste unitario novo trava a ausencia do bloco expandido e protege contra regressao visual simples.

**Tech Stack:** Next.js 15, React 19, TypeScript, MUI, Vitest, Testing Library

---

### Task 1: Cobrir a ausencia do cabecalho expandido

**Files:**
- Create: `src/tests/unit/app-shell-client.test.tsx`
- Reference: `src/components/layout/AppShellClient.tsx`

- [ ] **Step 1: Write the failing test**

Criar um teste que renderize `AppShellClient` com mocks para `SidebarNav` e `LogoutButton`, e verifique que os textos do cabecalho expandido nao aparecem.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/tests/unit/app-shell-client.test.tsx`
Expected: FAIL porque o layout ainda renderiza "Painel operacional" e a descricao.

- [ ] **Step 3: Write minimal implementation**

Remover o bloco superior expandido e manter apenas o botao de recolher/expandir no topo da sidebar.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/tests/unit/app-shell-client.test.tsx`
Expected: PASS

- [ ] **Step 5: Run adjacent regression test**

Run: `npm run test:unit -- src/tests/unit/sidebar-nav.test.tsx`
Expected: PASS
