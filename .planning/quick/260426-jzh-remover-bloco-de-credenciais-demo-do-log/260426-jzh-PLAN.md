---
phase: quick-260426-jzh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/modules/access/ui/login-form.tsx
  - src/tests/unit/login-form.test.tsx
autonomous: true
requirements:
  - QUICK-260426-jzh: Remover bloco de credenciais demo do formulário de login
must_haves:
  truths:
    - "Formulário de login não exibe a Typography 'Credenciais demo:'"
    - "Formulário de login não renderiza chips clicáveis (admin/engenharia/consulta)"
    - "Login continua funcional: usuário pode digitar email/senha, alternar visibilidade da senha e submeter"
    - "Suite de testes unitários do LoginForm passa após a remoção"
  artifacts:
    - path: "src/modules/access/ui/login-form.tsx"
      provides: "LoginForm sem bloco demo, sem array demoCredentials, sem imports não-usados"
      contains: "export function LoginForm"
    - path: "src/tests/unit/login-form.test.tsx"
      provides: "Testes do LoginForm sem asserções sobre chips demo"
      contains: "describe(\"LoginForm\""
  key_links:
    - from: "src/modules/access/ui/login-form.tsx"
      to: "MUI imports"
      via: "import statements"
      pattern: "^import.*(Chip|Box).*from \"@mui/material"
---

<objective>
Remover do `LoginForm` o bloco visual de "Credenciais demo" (chips clicáveis admin/engenharia/consulta) para alinhar o login com a postura de produção: sem credenciais expostas no UI. A criação de usuários administrativos permanece via CLI (`scripts/ops/create-user.ts`) — fora do escopo desta task.

Purpose: Eliminar exposição de credenciais demo no front e remover código morto associado (array `demoCredentials`, JSX de chips, imports não-usados). Atualizar testes unitários que dependem dos chips para que continuem cobrindo o comportamento residual (preencher campos, alternar visibilidade da senha) sem referenciar o bloco removido.

Output:
- `src/modules/access/ui/login-form.tsx` enxuto (sem `demoCredentials`, sem `<Box>` demo, sem imports `Chip`/`Box`/`Typography` se ficarem órfãos).
- `src/tests/unit/login-form.test.tsx` atualizado: o primeiro `it(...)` substituído por um teste equivalente que não depende dos chips.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@src/modules/access/ui/login-form.tsx
@src/tests/unit/login-form.test.tsx

<interfaces>
<!-- Estado atual relevante extraído dos arquivos a modificar. -->

`src/modules/access/ui/login-form.tsx` (estado atual — linhas-chave):
- L8 `import Box from "@mui/material/Box";`
- L9 `import Chip from "@mui/material/Chip";`
- L12 `import Stack from "@mui/material/Stack";`
- L14 `import Typography from "@mui/material/Typography";`
- L18-34: array `const demoCredentials = [ {label, email, password} x3 ] as const;`
- L74: `<Stack spacing={2.5}>` (wrapper principal — MANTER, é usado para empilhar os campos do formulário)
- L131-151: `<Box>` com `<Typography variant="caption">Credenciais demo:</Typography>` e `<Stack direction="row">{demoCredentials.map(...)}<Chip onClick={...} /></Stack></Box>` — REMOVER inteiro
- Setters usados pelos chips: `setEmail`, `setPassword`, `setMessage` — todos continuam usados em outros pontos (TextField onChange, handleSubmit), portanto MANTER

`src/tests/unit/login-form.test.tsx` (estado atual):
- Test 1 ("fills seed credentials from chips and toggles password visibility", L11-30):
  - Asserta presença dos botões `admin`/`engenharia`/`consulta` (L17-19) — REMOVER
  - Clica no chip `admin` e valida que email/senha foram preenchidos (L21-25) — SUBSTITUIR por `fireEvent.change` direto
  - Cobre toggle de visibilidade da senha (L27-29) — MANTER (importante)
- Test 2 ("shows the login error inside an alert ...", L32-54): independente dos chips — MANTER intacto
- Test 3 ("uses the configured base path ...", L56-82): independente dos chips — MANTER intacto

Imports MUI a auditar após remoção: `Box`, `Chip`, `Typography` ficam órfãos e devem ser removidos. `Stack` permanece (linha 74). `EmailOutlinedIcon`, `VisibilityIcon`, `VisibilityOffIcon`, `Alert`, `IconButton`, `InputAdornment`, `TextField`, `withBasePath`, `FormSubmitButton` permanecem todos usados.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Remover bloco demo do LoginForm e limpar imports órfãos</name>
  <files>src/modules/access/ui/login-form.tsx</files>
  <behavior>
    Após esta task:
    - O componente `<LoginForm />` NÃO renderiza nenhum elemento com texto "Credenciais demo:".
    - O componente NÃO renderiza chips com label "admin", "engenharia" ou "consulta".
    - O componente continua renderizando: Alert (quando `message` setado), TextField "Email", TextField "Senha", IconButton de toggle de visibilidade, FormSubmitButton "Entrar no painel".
    - O fluxo de submit (`handleSubmit`) e `withBasePath` permanecem inalterados.
    - O arquivo não contém referência alguma a `demoCredentials`, `Chip`, `Box` (a menos que `Box` seja usado em outro lugar — não é), nem `Typography` (idem).
  </behavior>
  <action>
    Editar `src/modules/access/ui/login-form.tsx`:

    1. **Remover o array `demoCredentials`** (linhas 18-34 do estado atual), incluindo a linha em branco que o segue se ficar dupla.

    2. **Remover o JSX do bloco demo** dentro do `<Stack spacing={2.5}>` principal — o `<Box>...</Box>` que contém a `<Typography variant="caption">Credenciais demo:</Typography>` e o `<Stack direction="row">` com os chips (linhas 131-151 do estado atual). NÃO remover o `<Stack spacing={2.5}>` externo nem nenhum outro filho dele (Alert condicional, TextFields, FormSubmitButton).

    3. **Limpar imports órfãos** (após remoção). Remover as linhas:
       - `import Box from "@mui/material/Box";`
       - `import Chip from "@mui/material/Chip";`
       - `import Typography from "@mui/material/Typography";`

       MANTER `import Stack from "@mui/material/Stack";` (ainda usado pelo `<Stack spacing={2.5}>` que envolve o formulário). MANTER todos os demais imports — são todos referenciados.

    4. **Não alterar** os `useState` (`message`, `pending`, `showPassword`, `email`, `password`) — todos ainda são usados pelos campos e pelo handler de submit.

    5. Rodar lint/type-check (next/lint via `npm run lint` e/ou `tsc --noEmit`) para confirmar que não há referências penduradas, mas a verificação automatizada principal é o teste unitário (Task 2) — então este passo é opcional se os testes passarem.

    Não introduzir comentários explicando a remoção; o git log já registra o motivo.
  </action>
  <verify>
    <automated>cd "C:/Users/felip/OneDrive/Área de Trabalho/projetos cliente/sis-restaurante" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "login-form\.tsx" ; echo "TSC_EXIT=$?"</automated>
  </verify>
  <done>
    - `grep -n "demoCredentials\|Credenciais demo\|from \"@mui/material/Chip\"\|from \"@mui/material/Box\"\|from \"@mui/material/Typography\"" src/modules/access/ui/login-form.tsx` retorna zero matches.
    - `tsc --noEmit` não emite erros novos referentes a `login-form.tsx`.
    - O JSX do componente ainda contém: `<Alert`, `<TextField`, `<FormSubmitButton`, e o `<Stack spacing={2.5}>` externo.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Atualizar testes unitários do LoginForm (remover dependência dos chips)</name>
  <files>src/tests/unit/login-form.test.tsx</files>
  <behavior>
    Após esta task:
    - O primeiro `it(...)` NÃO referencia mais os chips `admin`/`engenharia`/`consulta`.
    - O comportamento residual coberto é: digitar email + senha via `fireEvent.change`, e alternar visibilidade da senha via clique no IconButton (label "Mostrar senha"/"Ocultar senha").
    - Os outros dois `it(...)` (alerta de erro e base path) permanecem intactos.
    - `npm run test:unit -- login-form` (ou equivalente vitest) passa com 3 testes verdes.
  </behavior>
  <action>
    Editar `src/tests/unit/login-form.test.tsx`:

    1. **Substituir o primeiro `it(...)`** (linhas 11-30 do estado atual). Renomear para algo como:
       `it("permite preencher email e senha e alternar visibilidade da senha", () => { ... })`

       Nova implementação (preserva a cobertura do toggle de visibilidade, que é o comportamento real do componente que sobreviveu):

       ```tsx
       it("permite preencher email e senha e alternar visibilidade da senha", () => {
         render(<LoginForm />);

         const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
         const passwordInput = screen.getByLabelText("Senha") as HTMLInputElement;

         fireEvent.change(emailInput, { target: { value: "admin@sis-restaurante.local" } });
         fireEvent.change(passwordInput, { target: { value: "admin123" } });

         expect(emailInput.value).toBe("admin@sis-restaurante.local");
         expect(passwordInput.value).toBe("admin123");
         expect(passwordInput.type).toBe("password");

         fireEvent.click(screen.getByRole("button", { name: /mostrar senha/i }));

         expect(passwordInput.type).toBe("text");
       });
       ```

       (Opcional: adicionar uma asserção negativa `expect(screen.queryByText(/Credenciais demo/i)).not.toBeInTheDocument();` para travar o regressão. Recomendado.)

    2. **NÃO alterar** o segundo `it("shows the login error ...")` (linhas 32-54) nem o terceiro `it("uses the configured base path ...")` (linhas 56-82). Eles não referenciam chips.

    3. Imports do arquivo de teste já contêm `fireEvent`, `render`, `screen`, `waitFor` — não precisam mudar.
  </action>
  <verify>
    <automated>cd "C:/Users/felip/OneDrive/Área de Trabalho/projetos cliente/sis-restaurante" && npx vitest run src/tests/unit/login-form.test.tsx --reporter=default 2>&1 | tail -30</automated>
  </verify>
  <done>
    - `npx vitest run src/tests/unit/login-form.test.tsx` mostra 3 testes passando, 0 falhando.
    - `grep -n "admin.*engenharia\|getByRole.*admin\|getByRole.*consulta" src/tests/unit/login-form.test.tsx` retorna zero matches em contexto de chips (asserções de chip removidas).
    - Cobertura do toggle de visibilidade da senha mantida (asserção `passwordInput.type === "text"` após clique).
  </done>
</task>

</tasks>

<verification>
Sanity-check final do plano (executável manualmente após ambas as tasks):

1. `grep -nE "demoCredentials|Credenciais demo" src/modules/access/ui/login-form.tsx src/tests/unit/login-form.test.tsx` → zero matches.
2. `npx vitest run src/tests/unit/login-form.test.tsx` → 3/3 verde.
3. `npx tsc --noEmit` → sem novos erros.
4. (Opcional) Smoke manual: `npm run dev` e abrir `/login` — bloco "Credenciais demo:" deve estar ausente; campos de email/senha e botão "Entrar no painel" continuam funcionando.
</verification>

<success_criteria>
- Bloco de credenciais demo (Typography + chips) removido do `LoginForm`.
- Array `demoCredentials` removido.
- Imports `Box`, `Chip`, `Typography` removidos de `login-form.tsx`.
- `Stack`, `Alert`, `TextField`, `IconButton`, `InputAdornment`, ícones MUI, `withBasePath`, `FormSubmitButton` permanecem (todos ainda usados).
- Suite `login-form.test.tsx` passa com 3 testes verdes; nenhum teste referencia mais os chips removidos.
- Toggle de visibilidade da senha continua coberto por teste.
</success_criteria>

<output>
Após completar, criar `.planning/quick/260426-jzh-remover-bloco-de-credenciais-demo-do-log/260426-jzh-SUMMARY.md` documentando: linhas removidas, imports limpos, e ajuste no teste.
</output>
