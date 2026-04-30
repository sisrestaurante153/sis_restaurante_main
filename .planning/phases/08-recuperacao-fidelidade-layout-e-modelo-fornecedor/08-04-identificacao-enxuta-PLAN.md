---
phase: 08
plan: 04
plan_id: 08-04
description: Enxugar item-form.tsx — remover Unidade/Qtde/Preco/Fator soltos da Identificacao, mover Descricao para bloco Observacoes, aplicar grid conforme HTML tela-item-v1.html (D-09, D-12, PDFV2-ITEM-05)
type: execute
wave: 3
depends_on:
  - 08-02
  - 08-03
files_modified:
  - src/modules/catalog/ui/item-form.tsx
  - src/tests/unit/catalog/ItemForm.test.tsx
autonomous: true
requirements:
  - SPEC-ITEM-LAYOUT
  - PDFV2-ITEM-05
tags:
  - catalog
  - ui
  - identificacao
  - pixel-perfect
must_haves:
  truths:
    - "Identificacao tem exatamente 5 campos: Codigo, Nome, Status, Tipo, Categoria Operacional."
    - "Identificacao NAO contem Unidade de compra, Unidade de uso, Qtde compra, Qtde uso, Preco compra, Preco uso, Fator de Conversao — todos esses vivem dentro de cards de fornecedor (Bloco 2)."
    - "Descricao operacional aparece como bloco separado (Bloco 3 Observacoes) APOS o PurchasesEditor, marcada como (opcional)."
    - "Tela de item renderiza exatamente 3 FormSection: Identificacao, Detalhamento de Compras/Fornecedor, Observacoes."
    - "Cards laterais de rastreabilidade/custos foram removidos (PDFV2-ITEM-05)."
    - "Grid Row 1 da Identificacao usa grid-template-columns 140px 1fr 160px (Codigo | Nome | Status)."
    - "Grid Row 2 da Identificacao usa 1fr 1fr (Tipo | Categoria Operacional)."
  artifacts:
    - path: "src/modules/catalog/ui/item-form.tsx"
      provides: "Form de item com 3 blocos (Identificacao enxuta + Bloco 2 + Observacoes); sem Unidade/Qtde/Preco/Fator no topo"
      contains: "Observacoes"
    - path: "src/tests/unit/catalog/ItemForm.test.tsx"
      provides: "Cobertura RTL confirmando 3 FormSection e ausencia de campos derivados na Identificacao"
      min_lines: 60
  key_links:
    - from: "item-form.tsx <PurchasesEditor>"
      to: "Bloco 3 Observacoes (FormSection apos PurchasesEditor)"
      via: "ordem de render"
      pattern: "Observacoes"
    - from: "item-form.tsx Row 1 Identificacao"
      to: "grid-template-columns"
      via: "sx do container"
      pattern: "140px 1fr 160px"
---

<objective>
Enxugar `src/modules/catalog/ui/item-form.tsx` conforme HTML aprovado `update/tela-item-v1.html`:
Identificacao fica com apenas 5 campos (Codigo, Nome, Status, Tipo, Categoria Operacional), a
secao "Descricao e detalhamento operacional" e REMOVIDA inteira, e a textarea de Descricao passa
para um Bloco 3 "Observacoes" apos o `PurchasesEditor`. Remover props derivadas orfas
(stockUnitValue, conversionFactorValue, etc.). Aplicar grid-template-columns exato do HTML.

Purpose: cumprir SPEC-ITEM-LAYOUT e PDFV2-ITEM-05 — "Identificacao do item deixa de carregar
unidade/qtde/preco soltos; esses campos saem para dentro do bloco de fornecedor conforme HTML
aprovado `tela-item-v1.html`."

Output: item-form.tsx com 3 FormSection + grid pixel-perfect + test RTL verificando contagem
de blocos + ausencia de campos removidos.
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
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-02-schema-migracao-import-SUMMARY.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-03-ui-fornecedor-bloco2-SUMMARY.md
@src/modules/catalog/ui/item-form.tsx
@src/tests/unit/item-form.test.tsx
@update/tela-item-v1.html

<interfaces>
<!-- Contrato HTML tela-item-v1.html (linhas 178-220 Identificacao; 374-381 Observacoes). -->

Identificacao Row 1 — grid-template-columns: 140px 1fr 160px
- Codigo (140px): `<input value="LF8NHE">` required
- Nome (1fr): `<input value="Arroz branco">` required
- Status (160px): `<select>` Ativo/Inativo

Identificacao Row 2 — grid-template-columns: 1fr 1fr
- Tipo: `<select>` Insumo/Pre-preparo/Embalagem/Prato/Porcao required
- Categoria operacional: `<select>` Graos/Carnes/Laticinios/Hortifruti/Descartaveis required

Observacoes (Bloco 3) — grid-template-columns: 1 col
- Descricao operacional (opcional): `<textarea placeholder="Ex.: Arroz marca Albaruska...">`

Label com marcador opcional:
```html
<label>Descricao operacional <span class="opt">(opcional)</span></label>
```

Props `ItemFormProps` (limpar):
```ts
// REMOVER:
stockUnit?: string;
usageUnit?: string;
conversionFactor?: string;
usageQuantity?: string;
usagePrice?: string;
// PRESERVAR:
code: string; name: string; description?: string; type: ItemType; operationalCategory: string; active: boolean;
purchases: PurchaseRow[]; // passed through to PurchasesEditor
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0 RED): Criar src/tests/unit/catalog/ItemForm.test.tsx</name>
  <files>src/tests/unit/catalog/ItemForm.test.tsx</files>
  <read_first>
    - src/modules/catalog/ui/item-form.tsx (integral — entender layout atual, props, FormSection atual)
    - src/tests/unit/item-form.test.tsx (analog RTL com providers)
    - update/tela-item-v1.html linhas 178-220, 374-381
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §6
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-VALIDATION.md §Wave 0
  </read_first>
  <behavior>
    - Render do form: expect exatamente 3 elementos com role="region" OU com texto de card-label Identificacao / Detalhamento de Compras / Observacoes. Nao pode haver 4o bloco "Descricao e detalhamento operacional".
    - Identificacao contem exatamente 5 campos visiveis: Codigo, Nome do item, Status, Tipo, Categoria operacional (Secao). Contagem via `getAllByRole('textbox')` + `getAllByRole('combobox')` limitada ao escopo do FormSection Identificacao.
    - Identificacao NAO contem labels contendo "Unidade de compra", "Unidade de uso", "Quantidade de compra", "Quantidade de uso", "Preco de compra", "Preco de uso", "Fator de conversao".
    - Descricao operacional aparece DEPOIS do PurchasesEditor no DOM (usar `compareDocumentPosition` ou seletor por ordem).
    - Label "Descricao operacional" contem texto "(opcional)".
    - Props removidas do ItemFormProps: passar `stockUnit`, `usageUnit`, `conversionFactor` como undefined nao gera warning TS nem runtime — expect nenhum throw.
  </behavior>
  <action>
Criar `src/tests/unit/catalog/ItemForm.test.tsx` (novo arquivo) seguindo analog
`src/tests/unit/item-form.test.tsx` (imports, wrapper de providers MUI).

Estrutura mandatoria:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItemForm } from "@/modules/catalog/ui/item-form";
// providers MUI/theme como no analog

const minimalInitialValues = {
  code: "ITM001",
  name: "Teste",
  type: "insumo",
  operationalCategory: "Graos",
  active: true,
  description: "",
  purchases: []
};

describe("ItemForm — SPEC-ITEM-LAYOUT + PDFV2-ITEM-05", () => {
  it("renderiza exatamente 3 blocos: Identificacao, Detalhamento de Compras/Fornecedor, Observacoes", () => {
    render(<ItemForm initialValues={minimalInitialValues} /* outros props */ />);
    // Contar labels de card (card-label) ou headings — conforme FormSection implementa:
    const blocks = screen.getAllByText(/Identificacao|Detalhamento de Compras|Observacoes/i);
    // Pelo menos 3 labels de secao; NAO deve haver "Descricao e detalhamento operacional"
    expect(screen.queryByText(/Descricao e detalhamento operacional/i)).not.toBeInTheDocument();
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("Identificacao contem exatamente 5 campos (Codigo, Nome, Status, Tipo, Categoria)", () => {
    render(<ItemForm initialValues={minimalInitialValues} />);
    // Localizar escopo do primeiro FormSection:
    const identSection = screen.getByText(/^Identificacao$/i).closest("[data-testid='form-section']") || screen.getByText(/^Identificacao$/i).parentElement!;
    const scoped = within(identSection as HTMLElement);
    expect(scoped.getByLabelText(/Codigo/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/Nome do item/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/Status/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/^Tipo/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/Categoria operacional/i)).toBeInTheDocument();
  });

  it("Identificacao NAO contem campos de Unidade/Qtde/Preco/Fator", () => {
    render(<ItemForm initialValues={minimalInitialValues} />);
    const identSection = /* mesmo scope */;
    const scoped = within(identSection as HTMLElement);
    expect(scoped.queryByLabelText(/Unidade de compra/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Unidade de uso/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Quantidade de compra/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Quantidade de uso/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Preco de compra/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Preco de uso/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Fator de conversao/i)).not.toBeInTheDocument();
  });

  it("Bloco Observacoes aparece apos PurchasesEditor (ordem DOM)", () => {
    render(<ItemForm initialValues={minimalInitialValues} />);
    const purchases = screen.getByText(/Detalhamento de Compras/i);
    const obs = screen.getByText(/^Observacoes$/i);
    expect(purchases.compareDocumentPosition(obs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("Descricao operacional marcada como (opcional)", () => {
    render(<ItemForm initialValues={minimalInitialValues} />);
    const label = screen.getByText(/Descricao operacional/i);
    expect(label.textContent).toMatch(/opcional/i);
  });

  it("props removidas (stockUnit/usageUnit/conversionFactor) sao ignoradas sem erro", () => {
    // @ts-expect-error passing removed props should not throw at runtime
    expect(() => render(<ItemForm initialValues={{ ...minimalInitialValues, stockUnit: "kg", conversionFactor: "1" }} />)).not.toThrow();
  });

  it("cards laterais de rastreabilidade/custos ausentes (PDFV2-ITEM-05)", () => {
    render(<ItemForm initialValues={minimalInitialValues} />);
    expect(screen.queryByText(/Rastreabilidade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Resumo de Custos/i)).not.toBeInTheDocument();
  });
});
```

NOTA: Se o componente `FormSection` atual nao expoe `data-testid="form-section"`, ajustar
a query para usar o heading/label da secao (`screen.getByText("Identificacao")` +
`.closest(".MuiBox-root")` ou equivalente). Ler `FormSection` para confirmar.

RED esperado: testes 1-3 e 7 falham porque o componente ainda renderiza 4 blocos + campos derivados
no segundo bloco. Task 2 vira GREEN.
  </action>
  <verify>
    <automated>mkdir -p .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts && npm run test:unit -- ItemForm 2>&1 | tee .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-if-red.log && (grep -qE 'FAIL|failed' .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-if-red.log || (echo 'ERROR: RED gate not reached — tests did not fail' && exit 1))</automated>
  </verify>
  <acceptance_criteria>
    - `src/tests/unit/catalog/ItemForm.test.tsx` existe
    - Pelo menos 7 `it(...)` blocos
    - `grep -c "Descricao e detalhamento operacional" src/tests/unit/catalog/ItemForm.test.tsx` >= 1 (verificando ausencia)
    - `grep -c "Observacoes" src/tests/unit/catalog/ItemForm.test.tsx` >= 2
    - `grep -c "Fator de conversao" src/tests/unit/catalog/ItemForm.test.tsx` >= 1 (verificando ausencia)
    - `npm run test:unit -- ItemForm` retorna pelo menos 1 FAIL (RED)
  </acceptance_criteria>
  <done>Test RED confirmando gap entre estado atual e SPEC-ITEM-LAYOUT.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2 (GREEN): Refatorar item-form.tsx — 3 blocos, grid exato, props orfas removidas</name>
  <files>src/modules/catalog/ui/item-form.tsx</files>
  <read_first>
    - src/modules/catalog/ui/item-form.tsx (integral — mapear linhas de cada secao)
    - src/tests/unit/catalog/ItemForm.test.tsx (criado na Task 1 — gate GREEN)
    - update/tela-item-v1.html linhas 178-220 (grid Identificacao) e 374-381 (Observacoes)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §6
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md §6
  </read_first>
  <action>
**A) Remover inteira a segunda `FormSection "Descricao e detalhamento operacional"`**
(linhas ~245-324 conforme RESEARCH §6). Isso inclui todos os TextField de Unidade de compra,
Unidade de uso, Fator, Qtde Uso, Preco Uso, e qualquer card lateral de rastreabilidade.

**B) Limpar props e state orfaos** apos remocao:
- Remover state: `stockUnitValue`, `conversionFactorValue`, `usageQuantity` (state local), `usagePrice` (derivado).
- Remover helpers usados so pela secao removida: `toPositiveNumber`, `formatOperationalMetric`, `syncPurchaseUnit`.
- Remover de `ItemFormProps.initialValues` os campos: `stockUnit`, `usageUnit`, `conversionFactor`, `usageQuantity`, `usagePrice`.
- Atualizar o consumer (page de item — grep para localizar): `rg -l 'ItemForm' src/app src/modules` -> remover referencias a `initialValues.stockUnit/usageUnit/conversionFactor`.

**C) Ajustar grid da Identificacao ao HTML:**

Localizar a secao Identificacao atual (linhas ~150-243). Substituir o container MUI `<Grid container spacing={2}>` por duas `<Box>` com `display: grid` e `grid-template-columns` exatos:

```tsx
<FormSection title="Identificacao" description="...">
  {/* Row 1: Codigo 140px | Nome 1fr | Status 160px */}
  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr 160px", gap: 1.75, mb: 1.75 }}>
    <TextField required size="small" label="Codigo" name="code" ... />
    <TextField required size="small" label="Nome do item" name="name" ... />
    <TextField select size="small" label="Status" name="active" ...>
      <MenuItem value="true">Ativo</MenuItem>
      <MenuItem value="false">Inativo</MenuItem>
    </TextField>
  </Box>

  {/* Row 2: Tipo 1fr | Categoria operacional 1fr */}
  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.75 }}>
    <TextField select required size="small" label="Tipo" name="type" ...>{ /* opcoes */ }</TextField>
    <TextField select required size="small" label="Categoria operacional (Secao)" name="operationalCategory" ...>{ /* opcoes */ }</TextField>
  </Box>
</FormSection>
```

NAO incluir Descricao aqui (move para Bloco 3).

**D) Adicionar Bloco 3 Observacoes apos `<PurchasesEditor>`:**

```tsx
<FormSection title="Observacoes" description="">
  <TextField
    fullWidth
    multiline
    minRows={3}
    size="small"
    label={<>Descricao operacional <Box component="span" sx={{ color: "#888780", fontWeight: 400, fontSize: 10, ml: 0.5 }}>(opcional)</Box></>}
    name="description"
    placeholder="Ex.: Arroz marca Albaruska, grao longo, tipo 1. Preferir embalagem 5kg."
    defaultValue={initialValues.description ?? ""}
  />
</FormSection>
```

Ordem final no return:
```tsx
<>
  <FormSection title="Identificacao">...</FormSection>
  <FormSection title="Detalhamento de Compras / Fornecedor">
    <PurchasesEditor ... />
  </FormSection>
  <FormSection title="Observacoes">...</FormSection>
</>
```

Se `PurchasesEditor` ja esta envolto em seu proprio `<Box>`/`<Card>`, embrulha-lo em `FormSection title="Detalhamento de Compras / Fornecedor"`. Se o label do FormSection ja existir dentro do editor, remover duplicacao.

**E) Grep callers e limpar:**
```
rg "stockUnit:|usageUnit:|conversionFactor:" src/app src/modules
```
Para cada hit, remover a propriedade do objeto `initialValues` passado ao `ItemForm`. Se o hit estiver
em `catalog-prisma-mappers.ts` no `mapItemDetail` retornando `stock: {...}, usage: {...}`, PRESERVAR
esses campos no DTO por 1 ciclo (comentario `@deprecated`) — drop fisico sera em fase posterior (R3
em RESEARCH §11).

**F) Validar**: rodar `npm run test:unit -- ItemForm && npm run typecheck && npm run test:unit -- item-form`.
Expect: todos GREEN. Se `item-form.test.tsx` (spec antigo) quebrar porque testa presenca dos campos
removidos, atualizar o spec antigo removendo asserts obsoletos (ou marcar como superseded pelo novo
spec em `src/tests/unit/catalog/ItemForm.test.tsx`).
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:unit -- ItemForm && npm run test:unit -- item-form</automated>
  </verify>
  <acceptance_criteria>
    - `npm run test:unit -- ItemForm` exits 0 (7+ testes GREEN)
    - `grep -c 'Observacoes' src/modules/catalog/ui/item-form.tsx` >= 1
    - `grep -c 'Descricao e detalhamento operacional' src/modules/catalog/ui/item-form.tsx` returns 0 (bloco removido)
    - `grep -c '140px 1fr 160px' src/modules/catalog/ui/item-form.tsx` >= 1 (grid Row 1 exato)
    - `grep -c 'stockUnitValue\|conversionFactorValue' src/modules/catalog/ui/item-form.tsx` returns 0 (state orfao removido)
    - `npm run typecheck` exits 0
    - `npm run test:unit -- item-form` exits 0 (spec antigo nao regride OU foi atualizado para refletir novo layout)
    - `npm run test:e2e -- engineering-flow` exits 0 (zero regressao na ficha que depende de item)
  </acceptance_criteria>
  <done>item-form.tsx refatorado com 3 blocos, grid pixel-perfect, state orfao removido; testes GREEN.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client form -> server action -> repository | ja coberto por Zod do 08-02 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-04-01 | N/A | Pure UI refactor de form existente | accept | Plano apenas reorganiza layout/remove campos; sem nova attack surface. Authz herdada de catalog-actions.ts (saveItemAction, requirePermission). |
</threat_model>

<verification>
- `npm run typecheck` exits 0
- `npm run test:unit -- ItemForm` exits 0
- `npm run test:unit -- item-form` exits 0 (spec antigo)
- `npm run test:unit -- catalog` exits 0 (suite completa sem regressao)
- `npm run test:e2e -- engineering-flow` exits 0
- Visual smoke: abrir `/itens/{id}` — deve mostrar 3 cards (Identificacao, Detalhamento de Compras/Fornecedor, Observacoes); Identificacao Row 1 tem 3 cols (Codigo estreito, Nome flex, Status fixo); Row 2 tem 2 cols iguais; Descricao aparece por ultimo.
</verification>

<success_criteria>
1. item-form.tsx tem exatamente 3 FormSection: Identificacao, Detalhamento de Compras/Fornecedor, Observacoes.
2. Identificacao renderiza 5 campos (Codigo, Nome, Status, Tipo, Categoria).
3. Campos de Unidade/Qtde/Preco/Fator foram 100% removidos da Identificacao.
4. Descricao operacional aparece APOS o PurchasesEditor, com marcador "(opcional)".
5. Cards laterais de rastreabilidade/custos removidos (PDFV2-ITEM-05).
6. Grid da Identificacao Row 1 = "140px 1fr 160px" e Row 2 = "1fr 1fr".
7. Props orfas (stockUnit/usageUnit/conversionFactor) removidas de `ItemFormProps` e callers atualizados.
8. Test `src/tests/unit/catalog/ItemForm.test.tsx` GREEN com 7+ assertions.
9. Zero regressao em engineering-flow E2E.
</success_criteria>

<output>
Apos completar, criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-04-identificacao-enxuta-SUMMARY.md`
</output>
</content>
</invoke>