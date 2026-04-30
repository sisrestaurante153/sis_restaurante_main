---
phase: 08
plan: 03
plan_id: 08-03
description: Estender purchases-editor.tsx com Qtde/Unidade de uso por fornecedor, badge "fixado do 1o fornecedor", derivacao client-side, toggle principal com aviso (D-05, D-06, D-07, D-08, D-11, D-12)
type: execute
wave: 3
depends_on:
  - 08-02
files_modified:
  - src/modules/catalog/ui/purchases-editor.tsx
  - src/tests/unit/catalog/purchases-editor.test.tsx
autonomous: false
requirements:
  - SPEC-ITEM-FORNECEDOR
tags:
  - catalog
  - ui
  - fornecedor
  - pixel-perfect
must_haves:
  truths:
    - "Card do fornecedor principal exibe Unidade de uso e Qtde de uso como inputs editaveis."
    - "Cards secundarios exibem Unidade de uso e Qtde de uso como readonly verde com badge 'fixado do 1o fornecedor'."
    - "Secundarios derivam unidadeUso + quantidadeUso client-side do principal em tempo real."
    - "Fator de conversao aparece dentro de cada card, readonly verde, com hint 'Calculado automaticamente.'"
    - "Preco de uso por fornecedor usa seus proprios precoCompra/fator (D-07), nao o fator do principal."
    - "Toggle principal reseta demais para false; aviso inline 'Campos fixados atualizados a partir de {nome}' aparece brevemente."
    - "Botao Remover aparece apenas em secundarios (nao no principal)."
    - "Botao Adicionar fornecedor adiciona row com purchaseIsPrimary=false, usageUnit=\"\", usageQuantity=\"\"."
    - "HTML update/tela-item-v1.html e o contrato pixel-perfect (cor verde-claro dos secundarios segue HTML linha 98 — ver Task 4 decision note)."
  artifacts:
    - path: "src/modules/catalog/ui/purchases-editor.tsx"
      provides: "Cards de fornecedor estendidos com Unidade/Qtde de uso + badge fixado + readonly verde + derivacao client-side"
      contains: "fixado do 1"
    - path: "src/tests/unit/catalog/purchases-editor.test.tsx"
      provides: "Cobertura RTL: render 1 principal + 2 secundarios, toggle principal, badge presente, derivacao"
      min_lines: 100
  key_links:
    - from: "purchases-editor.tsx updateRow (toggle principal)"
      to: "Alert severity=info 'Campos fixados atualizados a partir de X'"
      via: "state transitorio de feedback"
      pattern: "Campos fixados atualizados"
    - from: "purchases-editor.tsx render de secundarios"
      to: "primaryRow.usageUnit / usageQuantity"
      via: "rows.find(r => r.purchaseIsPrimary)"
      pattern: "find\\(.*purchaseIsPrimary\\)"
    - from: "purchases-editor.tsx serialized hidden input"
      to: "item-form-schema.ts Zod parser"
      via: "purchasesJson"
      pattern: "purchasesJson"
---

<objective>
Estender `src/modules/catalog/ui/purchases-editor.tsx` (base entregue em pendencias-v3 #7, commit
592d0c8) com os campos Unidade de uso + Qtde de uso + Fator (readonly) + Preco de uso (readonly)
POR fornecedor, implementando D-05 (fixado do 1o), D-06 (toggle + aviso), D-07 (precoUso por
fornecedor), D-08 (validacao principal), D-11 (estender, nao refazer), D-12 (Fator so dentro do
card).

Purpose: cumprir SPEC-ITEM-FORNECEDOR — Bloco 2 com Fornecedor 1 principal + N adicionais, cada
um com unidade de compra, unidade de uso, quantidade de compra, quantidade de uso, fator (calc),
preco compra, preco uso (calc). Secundarios exibem badge "fixado do 1o fornecedor" nos campos
derivados. Segue pixel-perfect `update/tela-item-v1.html` linhas 227-362.

Output: purchases-editor.tsx estendido + test RTL cobrindo os comportamentos principais. Preserva
TODA estrutura ja entregue em pendencias-v3 (cards, borders, labels overline, botao Adicionar).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-VALIDATION.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-02-schema-migracao-import-SUMMARY.md
@src/modules/catalog/ui/purchases-editor.tsx
@src/tests/unit/item-form.test.tsx
@update/tela-item-v1.html

<interfaces>
<!-- Contratos extraidos de 08-RESEARCH.md §5 + 08-PATTERNS.md §7. -->

Tipo PurchaseRow estendido:
```ts
export interface PurchaseRow {
  supplierName: string;
  purchaseUnit: string;
  purchaseIsPrimary: boolean;
  purchaseQuantity: string;
  purchaseCost: string;
  priceUpdatedAt: string;
  usageUnit: string;                // NOVO
  usageQuantity: string;            // NOVO
  usageIsFixedFromPrimary: boolean; // NOVO (calculado client-side no render)
}
```

Contrato HTML tela-item-v1.html (ver linhas 227-362):
- **Fornecedor 1 — Principal** (bloco 1): row g-2-a (Fornecedor | Atualizado em), row g-2 (Unidade compra | Unidade uso), row g-3-b (Qtde compra | Qtde uso | Fator calc), row g-3-b (Preco compra | Preco uso calc | empty).
- **Fornecedor 2+** (bloco N): row g-2-a (Fornecedor | Atualizado em), row g-3-b (Unidade compra | Unidade uso calc+badge | empty), row g-3-b (Qtde compra | Qtde uso calc+badge | Fator calc), row g-3-b (Preco compra | Preco uso calc | empty).
- **Badge fixado**: `<span class="tag-fixado">fixado do 1º fornecedor</span>` (HTML linha 110): `fontSize:10; bg:#EAF3DE; color:#1B6B2C; border:0.5px solid #C0DD97; radius:4px; padding:1px 6px; margin-left:6px`.
- **Campo calc (readonly verde)**: HTML linhas 91-93: `bg:#EAF3DE; color:#1B6B2C; font-weight:500; border-color:#C0DD97; cursor:default`.
- **Hint**: HTML linha 88: `font-size:11px; color:#888780`. Texto: "Calculado automaticamente." para Fator; "Calculado a partir da compra principal." para Preco de uso.

Aviso inline D-06 (proposto):
```tsx
{showSwitchAlert && (
  <Alert severity="info" sx={{ fontSize: 12, py: 0.5, mb: 1.5 }}>
    Campos fixados atualizados a partir de {newPrimaryName}
  </Alert>
)}
```

Padrao readonly verde (copiar de purchases-editor.tsx linhas 277-296):
```tsx
<TextField
  fullWidth size="small"
  label={...}
  value={...}
  slotProps={{
    input: { readOnly: true },
    htmlInput: { "aria-readonly": "true" }
  }}
  helperText={...}
  sx={{
    "& .MuiInputBase-root": { bgcolor: "#EAF3DE" },
    "& .MuiInputBase-input": { color: "#1B6B2C", fontWeight: 500 }
  }}
/>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0 RED): Criar src/tests/unit/catalog/purchases-editor.test.tsx</name>
  <files>src/tests/unit/catalog/purchases-editor.test.tsx</files>
  <read_first>
    - src/modules/catalog/ui/purchases-editor.tsx (integral — entender props atuais PurchaseRow, onRowsChange)
    - src/tests/unit/item-form.test.tsx (analog RTL setup com providers)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-VALIDATION.md §Wave 0
    - update/tela-item-v1.html linhas 293-361 (contrato pixel-perfect dos secundarios)
  </read_first>
  <behavior>
    - Render com 1 row `purchaseIsPrimary=true`: expect ausencia de badge "fixado do 1o fornecedor", expect campos Unidade uso + Qtde uso editaveis (nao readonly).
    - Render com 2 rows (1 principal + 1 secundario): expect badge "fixado do 1o fornecedor" aparece 2x (na label de Unidade uso e Qtde uso do secundario).
    - Render com 2 rows (1 principal usageUnit="kg", usageQuantity="1"; 1 secundario sem usageUnit): expect que o input renderizado do secundario para Unidade de uso mostra "kg" (derivado client-side).
    - Toggle principal em secundario (simulating click): expect `onRowsChange` chamado com newPrincipal=true e demais rows `purchaseIsPrimary=false`; expect texto "Campos fixados atualizados a partir de {supplierName}" visivel brevemente.
    - Remover row secundario: expect `onRowsChange` chamado com array sem esse row; botao Remover NAO aparece no principal.
    - Botao Adicionar fornecedor: click -> `onRowsChange` com novo row `{ purchaseIsPrimary: false, usageUnit: "", usageQuantity: "" }`.
    - Fator derivado no principal (qtdeCompra=10, qtdeUso=1): expect input Fator = "10.0000".
    - Preco de uso no secundario (D-07): secundario tem qtdeCompra=10, qtdeUso=1 (derivado principal), custoCompra=80 -> expect input Preco de uso = "8.0000" (80/10), NAO usando fator do principal.
    - Secundario tem campos Unidade uso / Qtde uso com atributo `readOnly` = true.
    - Secundario tem campo Fator derivado dos SEUS proprios valores (qtdeCompra/qtdeUso-derivada).
  </behavior>
  <action>
Criar `src/tests/unit/catalog/purchases-editor.test.tsx` (novo arquivo) seguindo analog
`src/tests/unit/item-form.test.tsx`. Imports: `@testing-library/react`, `@testing-library/user-event`,
`vitest`, `PurchasesEditor` de `@/modules/catalog/ui/purchases-editor`.

Helper `renderEditor(initialRows)` que monta o component com providers MUI necessarios (ver analog
item-form.test.tsx) e retorna `{ user, onRowsChange, screen, rerender }`.

Estrutura mandatoria:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PurchasesEditor } from "@/modules/catalog/ui/purchases-editor";
// ... providers como item-form.test.tsx usa

const primaryRow = {
  supplierName: "VMARKET",
  purchaseUnit: "kg",
  purchaseIsPrimary: true,
  purchaseQuantity: "10.0000",
  purchaseCost: "80.0000",
  priceUpdatedAt: "2026-04-01",
  usageUnit: "kg",
  usageQuantity: "1.0000",
  usageIsFixedFromPrimary: false
};
const secondaryRow = {
  supplierName: "Atacadao",
  purchaseUnit: "fardo",
  purchaseIsPrimary: false,
  purchaseQuantity: "10.0000",
  purchaseCost: "80.0000",
  priceUpdatedAt: "",
  usageUnit: "",
  usageQuantity: "",
  usageIsFixedFromPrimary: true
};

describe("PurchasesEditor — SPEC-ITEM-FORNECEDOR (D-05, D-06, D-07, D-08, D-11)", () => {
  it("principal sozinho: sem badge fixado, campos usageUnit/usageQuantity editaveis", () => { /* ... */ });
  it("principal + secundario: badge 'fixado do 1o fornecedor' aparece 2x no secundario", () => {
    render(<PurchasesEditor rows={[primaryRow, secondaryRow]} onRowsChange={vi.fn()} /* outros props */ />);
    const badges = screen.getAllByText(/fixado do 1/i);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });
  it("secundario deriva usageUnit client-side do principal (D-05)", () => { /* asserta input value="kg" */ });
  it("secundario Unidade uso tem aria-readonly=true", () => { /* ... */ });
  it("toggle principal reseta demais para false + exibe alerta 'Campos fixados atualizados' (D-06)", async () => { /* user.click + expect onRowsChange + expect texto alerta */ });
  it("Remover aparece so em secundarios (principal sem botao Remover)", () => { /* ... */ });
  it("Adicionar fornecedor adiciona row com purchaseIsPrimary=false, usageUnit='', usageQuantity=''", async () => { /* ... */ });
  it("Fator derivado no principal = qtdeCompra/qtdeUso (10/1 = 10.0000)", () => { /* ... */ });
  it("Preco de uso no secundario usa seu proprio fator (D-07): 80/10=8.0000, nao o fator do principal", () => {
    // principal: qc=1 qu=1 fator=1 pu=80/1=80
    // secundario: qc=10 qu=derivado=1 fator=10 pu=80/10=8
    render(<PurchasesEditor rows={[{...primaryRow, purchaseQuantity:"1.0000", usageQuantity:"1.0000"}, {...secondaryRow, purchaseQuantity:"10.0000", purchaseCost:"80.0000"}]} onRowsChange={vi.fn()} />);
    // asserta que input Preco de uso no segundo card mostra "8.0000" (ou "R$ 8,00" conforme formatacao)
  });
});
```

RED esperado: todos os testes falham porque o componente ainda nao renderiza Unidade de uso,
Qtde de uso nem badge. Task 2 vira GREEN.
  </action>
  <verify>
    <automated>mkdir -p .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts && npm run test:unit -- purchases-editor 2>&1 | tee .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-ui-red.log && (grep -qE 'FAIL|failed' .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-ui-red.log || (echo 'ERROR: RED gate not reached — tests did not fail' && exit 1))</automated>
  </verify>
  <acceptance_criteria>
    - `src/tests/unit/catalog/purchases-editor.test.tsx` existe
    - Pelo menos 8 `it(...)` blocos com behavior descrito
    - `grep -c 'fixado do 1' src/tests/unit/catalog/purchases-editor.test.tsx` >= 2
    - `grep -c "Campos fixados atualizados" src/tests/unit/catalog/purchases-editor.test.tsx` >= 1
    - `grep -c "usageIsFixedFromPrimary" src/tests/unit/catalog/purchases-editor.test.tsx` >= 1
    - `npm run test:unit -- purchases-editor` retorna pelo menos 1 FAIL (RED)
  </acceptance_criteria>
  <done>Test RED cobrindo SPEC-ITEM-FORNECEDOR comportamentos UI.</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 1.5 (Decision — gate pre-implementacao): Cor verde no card — principal (atual) ou secundarios (HTML)?</name>
  <decision>
    HTML `update/tela-item-v1.html` linha 98 `.fornecedor-block + .fornecedor-block { background: #F0F7E8; border-color: #C0DD97; }` pinta os cards SECUNDARIOS em verde claro. O componente atual `purchases-editor.tsx` linha 151 pinta o PRINCIPAL em verde. Qual seguir?
  </decision>
  <context>
    Risco documentado em 08-RESEARCH.md §9.1 e §11 R10. O HTML e o contrato aprovado pelo cliente; o app atual foi entregue em pendencias-v3 commit 592d0c8. Inverter para bater com HTML custa 1 linha (trocar ternario). Manter o app custa uma anotacao em VERIFICATION.md justificando divergencia.
  </context>
  <options>
    <option id="option-a">
      <name>Inverter cor — secundarios verdes (bate HTML)</name>
      <pros>
        - Fidelidade pixel-perfect ao HTML aprovado (contrato D-15).
        - Destaque visual nos "fixado do 1o" — reforca que secundarios sao derivados.
      </pros>
      <cons>
        - Muda visual do principal (hoje esta em verde, passa a cinza claro).
        - Pode confundir usuarios acostumados com a cor atual (pendencias-v3 entregue ha 1 dia).
      </cons>
    </option>
    <option id="option-b">
      <name>Manter cor atual — principal verde (anotar divergencia do HTML)</name>
      <pros>
        - Zero mudanca visual do que ja foi entregue em pendencias-v3.
        - Argumento de usabilidade: principal em destaque e intuitivo.
      </pros>
      <cons>
        - Divergencia documentada do HTML aprovado — requer anotacao em VERIFICATION.md + release notes.
        - Cliente pode rejeitar novamente por drift visual (risco de recuperacao de confianca Phase 8).
      </cons>
    </option>
  </options>
  <resume-signal>
    Selecione: `option-a` (inverter — secundarios verdes bate HTML), `option-b` (manter — principal verde divergencia documentada), ou descreva terceira via.
  </resume-signal>
  <acceptance_criteria>
    - Usuario selecionou uma opcao
    - Se option-a: executor aplica mudanca 1-linha em purchases-editor.tsx (trocar `isPrimary ?` nas props `borderColor` e `bgcolor`) e re-roda `npm run test:unit -- purchases-editor`
    - Se option-b: executor adiciona nota em `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-DIVERGENCES.md` (criar se ausente) com referencia ao HTML linha 98 e ao commit atual
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 2 (GREEN): Estender purchases-editor.tsx — campos Unidade/Qtde uso, badge, derivacao, toggle com aviso</name>
  <files>src/modules/catalog/ui/purchases-editor.tsx</files>
  <read_first>
    - src/modules/catalog/ui/purchases-editor.tsx (integral — preservar TODA a estrutura atual)
    - update/tela-item-v1.html linhas 227-362 (contrato pixel-perfect)
    - src/tests/unit/catalog/purchases-editor.test.tsx (criado na Task 1 — gate GREEN)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §5 (sketches)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md §7 (pattern atual + estensao)
  </read_first>
  <action>
**Preservar sem alterar:** estrutura de Cards (Box com border/radius/bg), labels overline com supplierLabel,
IconButton Remover nos secundarios, botao Adicionar fornecedor no final (linhas 106-121), serialized
hidden input `purchasesJson` (linha ~124), grids 2fr 1fr de Fornecedor/Atualizado em, grid de
cabecalho.

**Estender:**

1. **Type `PurchaseRow`** (no topo do arquivo ou em `@/modules/catalog/types` se ja extraido):
   adicionar `usageUnit: string`, `usageQuantity: string`, `usageIsFixedFromPrimary: boolean`.
   Atualizar `buildDefaultRow(purchaseUnit)` (helper existente) para incluir:
   ```ts
   usageUnit: "",
   usageQuantity: "",
   usageIsFixedFromPrimary: false
   ```

2. **Derivacao client-side no render:** no inicio do componente (apos receber `rows`):
   ```ts
   const primaryRow = rows.find((r) => r.purchaseIsPrimary);
   const primaryUsageUnit = primaryRow?.usageUnit ?? "";
   const primaryUsageQuantity = primaryRow?.usageQuantity ?? "";
   ```
   Dentro do `.map((row, index) => ...)` de cada card:
   ```ts
   const isPrimary = row.purchaseIsPrimary;
   const displayUsageUnit = isPrimary ? row.usageUnit : primaryUsageUnit;
   const displayUsageQuantity = isPrimary ? row.usageQuantity : primaryUsageQuantity;
   const qc = Number(row.purchaseQuantity) || 0;
   const qu = Number(displayUsageQuantity) || 0;
   const fator = qu > 0 ? qc / qu : null;
   const precoUso = fator && fator > 0 ? Number(row.purchaseCost) / fator : null;
   ```

3. **Layout das linhas de medidas — reescrever a secao apos o cabecalho Fornecedor|Atualizado em**
   (localizar a regiao atual com Unidade de compra | Qtde compra | Preco) com TRES linhas
   batendo HTML `update/tela-item-v1.html` linhas 243-290 (principal) ou 313-361 (secundario):

   Linha A (`grid-template-columns: 1fr 1fr` para principal; `1fr 1fr .7fr` para secundario):
   - Unidade de compra (select editavel, ambos os casos)
   - Unidade de uso:
     - Principal: select editavel `<TextField select ... value={row.usageUnit} onChange={updateRow(...)} />`
     - Secundario: readonly verde com badge "fixado do 1o fornecedor" no label (componente Badge ou `<Chip>` inline ou `<Box component="span">`)

   Linha B (`grid-template-columns: 1fr 1fr .7fr`):
   - Quantidade de compra (input editavel)
   - Quantidade de uso:
     - Principal: input editavel
     - Secundario: readonly verde com badge no label
   - Fator de conversao: readonly verde, value=`fator?.toFixed(4) ?? "--"`, helperText="Calculado automaticamente."

   Linha C (`grid-template-columns: 1fr 1fr .7fr`):
   - Preco de compra (input editavel)
   - Preco de uso: readonly verde, value=`precoUso?.toFixed(4) ?? "--"`, helperText="Calculado a partir da compra principal." (ou "Calculado a partir da compra." — usar texto do HTML linha 287)
   - Slot vazio

4. **Badge "fixado do 1o fornecedor"** inline no label dos campos derivados dos secundarios.
   Componente inline (pode ser extraido como `FixadoBadge` no mesmo arquivo):

   ```tsx
   const FixadoBadge = () => (
     <Box component="span" sx={{
       fontSize: 10,
       bgcolor: "#EAF3DE",
       color: "#1B6B2C",
       border: "0.5px solid #C0DD97",
       borderRadius: "4px",
       padding: "1px 6px",
       fontWeight: 500,
       ml: 0.75
     }}>
       fixado do 1o fornecedor
     </Box>
   );
   ```
   Renderizar no `label` prop do TextField (MUI aceita ReactNode): `label={<>Unidade de uso <FixadoBadge /></>}`
   (apenas em secundarios).

5. **Campo readonly verde** reutilizar pattern linhas 277-296 existente para Preco de uso.
   Aplicar a: Unidade de uso (secundarios), Qtde de uso (secundarios), Fator (todos), Preco de uso (todos).

6. **Toggle principal (D-06):** na funcao `updateRow(index, patch)` (ou handler de checkbox/radio
   do principal), quando o patch mudar `purchaseIsPrimary: true`:
   ```ts
   function handleTogglePrimary(index: number) {
     const newPrimaryName = rows[index]?.supplierName ?? "novo fornecedor";
     onRowsChange(rows.map((r, i) => ({ ...r, purchaseIsPrimary: i === index })));
     setPrimarySwitchMessage(`Campos fixados atualizados a partir de ${newPrimaryName}`);
     setTimeout(() => setPrimarySwitchMessage(null), 3000);
   }
   ```
   No render, antes dos cards:
   ```tsx
   {primarySwitchMessage && (
     <Alert severity="info" sx={{ fontSize: 12, py: 0.5, mb: 1.5 }}>
       {primarySwitchMessage}
     </Alert>
   )}
   ```

7. **UI para "marcar como principal"** — **confirmado por grep:** hoje NAO existe toggle explicito em `purchases-editor.tsx` (linhas 1-300 inspecionadas; o primeiro row e sempre marcado como principal via `index === 0` — veja linhas 85 e 114 do componente atual; nao ha Button/Checkbox/Switch de "principal"). Este plano ADICIONA o controle:

   Adicionar `<Button size="small" variant="text">Tornar principal</Button>` no `<Stack direction="row" alignItems="center" justifyContent="space-between">` do cabecalho de cada card SECUNDARIO (proximo ao IconButton Remover atual, linha ~171-177 do componente). O botao aparece CONDICIONAL a `!isPrimary`. onClick chama `handleTogglePrimary(index)` definido no step 6. Estilo: `sx={{ fontSize: 11, color: "#185FA5", textTransform: "none" }}` (bate padrao .add-btn do HTML).

   No cabecalho do card PRINCIPAL, nao renderizar o botao (e ja o principal). O label overline do principal ja exibe "Fornecedor N — Principal" (linha 139-141 do componente atual), entao o usuario tem contexto visual.

8. **Serializacao:** `<input type="hidden" name="purchasesJson" value={JSON.stringify(rows)} />` ja
   existe — agora automaticamente carrega os novos campos. Nenhuma mudanca de serializacao necessaria.

9. **DECISAO R10 — cor verde (resolvida PRE-implementacao na Task 1.5):** aplicar o resultado de `<result_from_task_1_5>` sem defaults. NAO assumir "MANTER principal verde" nem "inverter" antes da Task 1.5 resolver.
   - Se Task 1.5 retornou `option-a` (inverter — secundarios verdes bate HTML): aplicar `borderColor: isPrimary ? "divider" : "#C0DD97"` e `bgcolor: isPrimary ? "#FAFAF9" : "#F0F7E8"`. Remover logica verde do principal (label color, etc).
   - Se Task 1.5 retornou `option-b` (manter — principal verde): preservar o ternario atual `borderColor: isPrimary ? "#C0DD97" : "divider"` + `bgcolor: isPrimary ? "#F0F7E8" : "#FAFAF9"`, e registrar divergencia em `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-DIVERGENCES.md`.
   A Task 2 NAO inicia a implementacao ate a Task 1.5 emitir resposta.

10. **Nao alterar** `buildDefaultRow`, `onRowsChange` signature, nem o hidden input name.
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:unit -- purchases-editor</automated>
  </verify>
  <acceptance_criteria>
    - `npm run test:unit -- purchases-editor` exits 0 (todos os 8+ testes passam)
    - `grep -c 'fixado do 1' src/modules/catalog/ui/purchases-editor.tsx` >= 1
    - `grep -c 'Campos fixados atualizados' src/modules/catalog/ui/purchases-editor.tsx` >= 1
    - `grep -c 'Calculado automaticamente' src/modules/catalog/ui/purchases-editor.tsx` >= 1
    - `grep -c 'Calculado a partir da compra' src/modules/catalog/ui/purchases-editor.tsx` >= 1
    - `grep -c 'primaryRow' src/modules/catalog/ui/purchases-editor.tsx` >= 1 (derivacao)
    - `grep -c 'usageQuantity' src/modules/catalog/ui/purchases-editor.tsx` >= 3
    - `npm run typecheck` exits 0
    - `npm run test:unit -- item-form` exits 0 (zero regressao em spec existente)
  </acceptance_criteria>
  <done>purchases-editor.tsx estendido com Unidade/Qtde uso, badge, derivacao client-side e toggle com aviso; todos os testes RTL GREEN.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client form -> serialized hidden input -> server action Zod | Payload JSON construido client-side; Zod valida apos submit |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-03-01 | Tampering | Usuario edita `usageUnit`/`usageQuantity` do secundario via DevTools e submete | accept | D-05: servidor IGNORA esses campos no secundario (repository linhas 571 ja setam null); render readonly e conveniencia, nao garantia de seguranca; controlada por Zod+repository. Test de integration na 08-02 cobre isso. |
| T-08-03-02 | Tampering | Usuario remove atributo `readOnly` do Fator/Preco de uso e submete | accept | Campos derivados nao sao enviados (nao tem name em form); derivados no presenter no read. Serializacao atual so envia `rows` via hidden input. |
| T-08-03-03 | DoS | Adicionar N fornecedores massivamente trava UI | mitigate | Ja mitigado: componente renderiza por map, sem limite artificial, mas `saveItemAction` limita pela Zod schema e DB tem unique constraint. Baixa probabilidade. |
| T-08-03-04 | Info Disclosure | Pure UI refactor de componente de edicao interno — sem nova attack surface | accept | Preserva mesmo perimetro auth do save (catalog-actions.ts). Plano nao toca authz. |
</threat_model>

<verification>
- `npm run typecheck` exits 0
- `npm run test:unit -- purchases-editor` exits 0 (8+ testes GREEN)
- `npm run test:unit -- item-form` exits 0 (zero regressao no consumer)
- Visual smoke: abrir `http://localhost:3000/itens/{id}` com item de 2 fornecedores cadastrado — secundario deve exibir badge "fixado do 1o fornecedor" ao lado das labels Unidade de uso e Qtde de uso; Fator derivado aparece em verde; toggle principal mostra alerta transitorio.
- `npm run test:e2e -- engineering-flow` exits 0 (zero regressao)
</verification>

<success_criteria>
1. purchases-editor.tsx renderiza Unidade de uso + Qtde de uso POR fornecedor com derivacao client-side.
2. Badge "fixado do 1o fornecedor" aparece em secundarios, com estilo exato do HTML linha 110.
3. Fator e Preco de uso readonly verde dentro de cada card; hints "Calculado automaticamente." e "Calculado a partir da compra."
4. Toggle principal emite aviso inline "Campos fixados atualizados a partir de X" e re-renderiza secundarios com derivacao atualizada.
5. Preco de uso por fornecedor usa seus proprios valores (D-07) — nao fator do principal.
6. Test RTL cobre D-05, D-06, D-07, D-11 (8+ assertions).
7. Decisao R10 (cor verde) tomada e registrada (option-a aplicada ou option-b anotada em 08-DIVERGENCES.md).
8. Zero regressao em item-form.test.tsx, engineering-flow.spec.ts.
</success_criteria>

<output>
Apos completar, criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-03-ui-fornecedor-bloco2-SUMMARY.md`
</output>
</content>
</invoke>