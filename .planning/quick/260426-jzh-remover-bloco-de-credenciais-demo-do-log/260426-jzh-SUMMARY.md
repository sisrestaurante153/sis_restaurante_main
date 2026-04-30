---
phase: quick-260426-jzh
plan: 01
subsystem: access/login
tags: [login, ui, security, cleanup]
dependency_graph:
  requires:
    - LoginForm existente em src/modules/access/ui/login-form.tsx
  provides:
    - LoginForm sem credenciais demo expostas no front
  affects:
    - Tela /login (sem chips demo)
    - Suite unit src/tests/unit/login-form.test.tsx
tech_stack:
  added: []
  patterns:
    - Remoção de imports órfãos pós-cleanup
    - Regression guard via queryByText().not.toBeInTheDocument()
key_files:
  created: []
  modified:
    - src/modules/access/ui/login-form.tsx
    - src/tests/unit/login-form.test.tsx
decisions:
  - Bloco demo removido do UI; criação de usuários administrativos permanece via CLI scripts/ops/create-user.ts (fora do escopo)
  - Test 1 reescrito para cobrir o comportamento residual real (digitação + toggle de visibilidade) com assertion regression-guard sobre ausência da copy "Credenciais demo"
  - Stack mantido (ainda envolve formulário); Box/Chip/Typography removidos por estarem órfãos após o drop do bloco demo
metrics:
  duration_seconds: 88
  completed_date: "2026-04-26T17:27:38Z"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260426-jzh: Remover bloco de Credenciais demo do login form — Summary

Removeu do `LoginForm` o bloco visual de "Credenciais demo" (Typography + chips clicáveis admin/engenharia/consulta) e respectivos imports órfãos (`Box`, `Chip`, `Typography`); atualizou o teste unitário que dependia dos chips para cobrir o comportamento residual via `fireEvent.change` + toggle de visibilidade, com regression guard contra a copy removida.

## Tasks Executed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Remover bloco demo do LoginForm e limpar imports órfãos | 166c566 | src/modules/access/ui/login-form.tsx |
| 2 | Atualizar testes unitários do LoginForm (remover dependência dos chips) | c4549d0 | src/tests/unit/login-form.test.tsx |

## Implementation Notes

### Task 1 — `src/modules/access/ui/login-form.tsx`
- Removido o array `demoCredentials` (3 entradas: admin/engenharia/consulta) — antes ocupava as linhas 18–34.
- Removido o JSX do bloco demo (`<Box>` + `<Typography variant="caption">Credenciais demo:</Typography>` + `<Stack direction="row">` com `<Chip clickable>`) que ficava ao final do `<Stack spacing={2.5}>` principal.
- Removidos os imports órfãos:
  - `import Box from "@mui/material/Box";`
  - `import Chip from "@mui/material/Chip";`
  - `import Typography from "@mui/material/Typography";`
- Mantidos: `Stack` (envolve o formulário), `Alert` (condicional em erro), `TextField`, `IconButton`, `InputAdornment`, ícones MUI, `withBasePath`, `FormSubmitButton`, e todos os `useState` (continuam usados pelo handler/form fields).
- Diff: −43 linhas, +0 linhas.

### Task 2 — `src/tests/unit/login-form.test.tsx`
- Substituído o primeiro `it()`:
  - Antes: `"fills seed credentials from chips and toggles password visibility"` (assertava `getByRole("button", { name: /admin|engenharia|consulta/i })`).
  - Depois: `"permite preencher email e senha e alternar visibilidade da senha"` — usa `fireEvent.change` direto nos inputs e mantém a cobertura do toggle de visibilidade (`passwordInput.type === "text"` após clique em "Mostrar senha").
- Adicionada asserção de regressão `expect(screen.queryByText(/Credenciais demo/i)).not.toBeInTheDocument()`.
- Os outros dois `it()` (alerta de erro e base path) permaneceram intactos.

## Verification

- `grep -nE "demoCredentials|Credenciais demo" src/modules/access/ui/login-form.tsx`: zero matches.
- `grep -nE "demoCredentials|Credenciais demo" src/tests/unit/login-form.test.tsx`: 1 match (regression guard intencional na linha 17).
- `npx vitest run src/tests/unit/login-form.test.tsx`: **PASS (3) FAIL (0)** — 3 testes verdes.
- `npx tsc --noEmit -p tsconfig.json | grep -E "login-form\.tsx"`: zero matches (sem erros novos referentes a `login-form.tsx`).

## Success Criteria

- [x] Bloco de credenciais demo (Typography + chips) removido do LoginForm.
- [x] Array `demoCredentials` removido.
- [x] Imports `Box`, `Chip`, `Typography` removidos de `login-form.tsx`.
- [x] `Stack`, `Alert`, `TextField`, `IconButton`, `InputAdornment`, ícones MUI, `withBasePath`, `FormSubmitButton` permanecem.
- [x] Suite `login-form.test.tsx` passa com 3 testes verdes; nenhum teste referencia mais os chips removidos.
- [x] Toggle de visibilidade da senha continua coberto por teste (`passwordInput.type === "text"`).

## Deviations from Plan

None — plan executed exactly as written. Os dois passos opcionais sugeridos no plano foram aplicados: (i) lint/type-check ran limpo no escopo do arquivo; (ii) regression guard `queryByText(/Credenciais demo/i)).not.toBeInTheDocument()` adicionado ao teste reescrito (recomendado pelo plano).

Observação operacional: `tsconfig.tsbuildinfo` foi modificado pelos `npx tsc` runs locais mas NÃO foi incluído nos commits (já estava `M` antes da tarefa começar; sem mudança de escopo).

## TDD Gate Compliance

Os tasks têm `tdd="true"` mas a sequência do plano é invertida em relação ao RED→GREEN clássico (Task 1 = source change, Task 2 = test alignment). Seguido literalmente conforme o plano: `refactor(login)` antes de `test(login)`. Testes existentes ficaram em estado RED transitório entre os dois commits, e voltam a GREEN após Task 2 (verificado).

## Self-Check: PASSED

- FOUND: src/modules/access/ui/login-form.tsx
- FOUND: src/tests/unit/login-form.test.tsx
- FOUND commit: 166c566 (Task 1)
- FOUND commit: c4549d0 (Task 2)
- 3/3 unit tests green em `login-form.test.tsx`
