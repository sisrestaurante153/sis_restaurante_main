---
plan_id: 09-03
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 03
type: tdd
wave: 2
depends_on: [09-01]
files_modified:
  - src/modules/engineering/ui/ficha-form.tsx
  - src/modules/engineering/ui/ficha-form.test.tsx
autonomous: true
requirements:
  - SPEC-4-TELAS-ESTRITO
  - SPEC-FICHA-FIDELIDADE
tags: [ui, pixel-perfect, ficha, identificacao, tdd]

must_haves:
  truths:
    - "Ficha Identificacao Row 1 usa Box sx gridTemplateColumns '110px 1fr 150px 175px' (literal no source)"
    - "Ficha Identificacao Row 2 usa Box sx gridTemplateColumns '1fr 1fr 120px 1fr' (literal no source)"
    - "Labels exibidos na ordem do HTML: Cod., Produto, Data de criacao, Data e hora da ultima alteracao, Modalidade, Grupo operacional, Status, Custo atual da ficha"
    - "Custo atual box azul usa tokens pixel-perfect: #E6F1FB bg, #185FA5 text, fontSize 18 fontWeight 600"
    - "MUI Grid <Grid container> removido do bloco Identificacao"
  artifacts:
    - path: "src/modules/engineering/ui/ficha-form.tsx"
      provides: "Bloco Identificacao com Box sx CSS grid 1:1 HTML"
      contains: "gridTemplateColumns: '110px 1fr 150px 175px'"
    - path: "src/modules/engineering/ui/ficha-form.test.tsx"
      provides: "Unit tests RED-first cobrindo grid + labels pixel-perfect"
      contains: "110px 1fr 150px 175px"
  key_links:
    - from: "src/modules/engineering/ui/ficha-form.tsx"
      to: "ComponentsEditor"
      via: "childrens prop unchanged"
      pattern: "<ComponentsEditor"
---

<objective>
Refactor pixel-perfect do bloco Identificacao do `ficha-form.tsx` usando Box sx CSS grid (padrao Phase 8 D-09 em item-form.tsx) para match 1:1 com HTML `update/tela-ficha-tecnica-v2.html` linhas 253-268. Substituir MUI `<Grid container>` por `<Box sx={{ display: 'grid', gridTemplateColumns: ... }}>`. Preservar MUI TextField/Select com sx override para match tokens. Ajustar box Custo atual para match HTML linha 266 (bg #E6F1FB, fontSize 18, fontWeight 600). Aplicar TDD RED→GREEN com commits separados (D-04).

Purpose: Fechar SPEC-FICHA-FIDELIDADE + SPEC-4-TELAS-ESTRITO do bloco Identificacao da Ficha; resolver gap pixel-perfect (atual MUI Grid viola contrato HTML).
Output: ficha-form.tsx Identificacao 1:1 HTML; ficha-form.test.tsx novo com RED-first asserts.
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
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md
@update/tela-ficha-tecnica-v2.html
@src/modules/engineering/ui/ficha-form.tsx
@src/modules/catalog/ui/item-form.tsx

<interfaces>
<!-- PATTERN INHERITED from Phase 8 D-09 / item-form.tsx:118-203 -->
<!-- Solucao canonica: Box sx CSS grid literal, greppavel no source -->

Reference pattern (item-form.tsx linhas 118-124):
```tsx
<Box
  sx={{
    display: "grid",
    gridTemplateColumns: "140px 1fr 160px",
    gap: 1.75,
    mb: 1.75
  }}
>
  <TextField ... />
  <TextField ... />
  <TextField ... />
</Box>
```

<!-- HTML target (update/tela-ficha-tecnica-v2.html linhas 60-61): -->
```css
.g-id1 { grid-template-columns: 110px 1fr 150px 175px; }
.g-id2 { grid-template-columns: 1fr 1fr 120px 1fr; }
```

<!-- HTML Row 1 fields (linhas 253-260): -->
<!--   Cod. (readonly, 110px) | Produto (required, 1fr) | Data de criacao (readonly, 150px) | Data e hora da ultima alteracao (readonly, 175px) -->

<!-- HTML Row 2 fields (linhas 261-268): -->
<!--   Modalidade (select, 1fr) | Grupo operacional (input, 1fr) | Status (select, 120px) | Custo atual da ficha (box azul, 1fr) -->

<!-- HTML Custo atual (linha 266): -->
<!--   .custo-atual { padding: 7px 12px; border-radius: 6px; border: 0.5px solid #D3D1C7; background: #E6F1FB; } -->
<!--   .custo-atual .r { font-size: 11px; color: #185FA5; font-weight: 500 } -->
<!--   .custo-atual .v { font-size: 18px; color: #185FA5; font-weight: 600 } -->

<!-- Current ficha-form.tsx Identificacao (linhas 230-362): usa <Grid container spacing={2}> + <Grid size={{ xs, md }}> — BLAST RADIUS: substituir por 2 <Box> grids + TextField children diretos -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (RED): ficha-form.test.tsx com grid + labels asserts</name>
  <files>src/modules/engineering/ui/ficha-form.test.tsx</files>
  <read_first>
    - src/modules/engineering/ui/ficha-form.tsx linhas 1-100, 220-362 (entender props e estrutura atual)
    - src/modules/catalog/ui/item-form.tsx linhas 118-203 (padrao referencia)
    - update/tela-ficha-tecnica-v2.html linhas 253-268 (contrato Identificacao)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-01..D-04
    - Verificar se `src/modules/engineering/ui/ficha-form.test.tsx` existe; se nao, criar novo
  </read_first>
  <behavior>
    Tests FAIL (RED) porque o componente atual usa `<Grid container>` ao inves de `<Box sx={{ gridTemplateColumns: '110px 1fr 150px 175px' }}>`.

    - Test 1: Source do ficha-form.tsx contem a string literal `'110px 1fr 150px 175px'` (via fs.readFileSync + match).
    - Test 2: Source do ficha-form.tsx contem a string literal `'1fr 1fr 120px 1fr'`.
    - Test 3: Render `<FichaForm initialValues={mockFicha} />` mostra label `"Cod."` (getByLabelText case-insensitive).
    - Test 4: Render mostra label `"Produto"`.
    - Test 5: Render mostra label `"Data de criacao"`.
    - Test 6: Render mostra label `"Data e hora da ultima alteracao"`.
    - Test 7: Render mostra label `"Modalidade"`.
    - Test 8: Render mostra label `"Grupo operacional"`.
    - Test 9: Render mostra label `"Status"`.
    - Test 10: Render mostra texto `"Custo atual da ficha"`.
    - Test 11: Source contem `'#E6F1FB'` (custo atual bg).
    - Test 12: Source contem `fontSize: 18` + `fontWeight: 600` associados ao valor do custo atual.
  </behavior>
  <action>
    Criar ou atualizar `src/modules/engineering/ui/ficha-form.test.tsx` com:

    ```tsx
    import fs from "node:fs";
    import path from "node:path";
    import { render, screen } from "@testing-library/react";
    import { describe, expect, it } from "vitest"; // ou jest, conforme setup
    import { FichaForm } from "./ficha-form";

    const FICHA_FORM_SOURCE = fs.readFileSync(
      path.resolve(__dirname, "ficha-form.tsx"),
      "utf-8"
    );

    const mockFicha = {
      itemName: "Arroz de forno",
      itemType: "prato",
      status: "ativa",
      yieldMode: "peso_final",
      percentLoss: null,
      finalWeight: "1.0000",
      portions: "1.0000",
      preparationMode: "",
      notes: "",
      groupOperational: "Pratos quentes",
      createdAtLabel: "15/04/2026",
      updatedAtLabel: "19/04/2026 10:30",
      version: 1,
      summary: {
        /* mock minimal summary */
      },
      stages: []
    };

    const mockModalityOptions = [{ id: "m1", label: "Almoco" }];
    const mockStageTypeOptions = [{ id: "s1", code: "coccao", label: "Coccao" }];
    const mockItemOptions: Array<{ id: string; name: string; type: string }> = [];

    describe("FichaForm Identificacao pixel-perfect", () => {
      it("source contem gridTemplateColumns Row 1 '110px 1fr 150px 175px' (D-01)", () => {
        expect(FICHA_FORM_SOURCE).toContain("gridTemplateColumns: '110px 1fr 150px 175px'");
      });

      it("source contem gridTemplateColumns Row 2 '1fr 1fr 120px 1fr' (D-01)", () => {
        expect(FICHA_FORM_SOURCE).toContain("gridTemplateColumns: '1fr 1fr 120px 1fr'");
      });

      it("render mostra label 'Cod.' (D-01 label exact)", () => {
        render(
          <FichaForm
            itemOptions={mockItemOptions}
            modalityOptions={mockModalityOptions}
            stageTypeOptions={mockStageTypeOptions}
            initialValues={mockFicha}
          />
        );
        expect(screen.getByLabelText(/^Cod\.?$/i)).toBeInTheDocument();
      });

      it.each([
        "Produto",
        "Data de criacao",
        "Data e hora da ultima alteracao",
        "Modalidade",
        "Grupo operacional",
        "Status"
      ])("render mostra label exato '%s'", (label) => {
        render(
          <FichaForm
            itemOptions={mockItemOptions}
            modalityOptions={mockModalityOptions}
            stageTypeOptions={mockStageTypeOptions}
            initialValues={mockFicha}
          />
        );
        expect(screen.getByLabelText(new RegExp(label, "i"))).toBeInTheDocument();
      });

      it("render mostra texto 'Custo atual da ficha' (D-03)", () => {
        render(
          <FichaForm
            itemOptions={mockItemOptions}
            modalityOptions={mockModalityOptions}
            stageTypeOptions={mockStageTypeOptions}
            initialValues={mockFicha}
          />
        );
        expect(screen.getByText("Custo atual da ficha")).toBeInTheDocument();
      });

      it("source contem token azul-l '#E6F1FB' no box custo atual (D-03)", () => {
        expect(FICHA_FORM_SOURCE).toContain("#E6F1FB");
      });

      it("source contem fontSize: 18 e fontWeight: 600 para valor custo atual (D-03)", () => {
        // D-03: HTML marca 600, nao 700. Valor atual no codigo: 700 → deve mudar para 600 em Task 2 GREEN.
        expect(FICHA_FORM_SOURCE).toMatch(/fontSize:\s*18[^}]*fontWeight:\s*600|fontWeight:\s*600[^}]*fontSize:\s*18/);
      });
    });
    ```

    Rodar: `npm run test:unit -- ficha-form`. RED esperado: alguns tests FAIL (gridTemplateColumns '110px 1fr 150px 175px' nao existe ainda — atual usa Grid container; fontWeight 700 atual vs 600 esperado).

    **COMMIT RED (separado per D-04):**
    ```bash
    git add src/modules/engineering/ui/ficha-form.test.tsx
    git commit -m "test(09-03): add RED unit tests for ficha identificacao pixel-perfect"
    ```
  </action>
  <verify>
    <automated>test -f src/modules/engineering/ui/ficha-form.test.tsx &amp;&amp; grep -c "110px 1fr 150px 175px" src/modules/engineering/ui/ficha-form.test.tsx &amp;&amp; grep -c "1fr 1fr 120px 1fr" src/modules/engineering/ui/ficha-form.test.tsx &amp;&amp; (npm run test:unit -- ficha-form; exit 0)</automated>
  </verify>
  <acceptance_criteria>
    - File `src/modules/engineering/ui/ficha-form.test.tsx` exists
    - File contains literal `110px 1fr 150px 175px` (grep, at least 1 match)
    - File contains literal `1fr 1fr 120px 1fr` (grep, at least 1 match)
    - File contains literal `#E6F1FB` (grep)
    - File contains `getByLabelText` or `getByText` for `Cod.`, `Produto`, `Data de criacao`, `Data e hora da ultima alteracao`, `Modalidade`, `Grupo operacional`, `Status`, `Custo atual da ficha` (grep each label)
    - `npm run test:unit -- ficha-form` executa (pode ter failures — RED state esperado). Exit code pode ser != 0 neste ponto; o GREEN task corrige.
    - Git log shows commit message containing `test(09-03): add RED` (or similar) — verify with `git log --oneline -5` contains this commit separately from GREEN commit
  </acceptance_criteria>
  <done>
    Suite RED commited em commit separado; tests reproduzem gap entre estado atual (MUI Grid + fontWeight 700) e contrato HTML (Box sx grid literals + fontWeight 600).
  </done>
</task>

<task type="auto">
  <name>Task 2 (GREEN): Refactor ficha-form.tsx Identificacao Box sx grid + custo atual pixel-perfect (D-01..D-03)</name>
  <files>src/modules/engineering/ui/ficha-form.tsx</files>
  <read_first>
    - src/modules/engineering/ui/ficha-form.tsx linhas 230-362 (estado atual MUI Grid + Custo atual)
    - src/modules/engineering/ui/ficha-form.test.tsx (Task 1 output — tests que precisam ficar GREEN)
    - src/modules/catalog/ui/item-form.tsx linhas 118-203 (padrao referencia)
    - update/tela-ficha-tecnica-v2.html linhas 253-268, 47-54, 60-61, 266
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-01, D-02, D-03
  </read_first>
  <action>
    Em `src/modules/engineering/ui/ficha-form.tsx`:

    1. **Remover import `Grid`** (linha 6) se nao usado em outro lugar do arquivo. Pesquisar `<Grid` no arquivo — se so aparecer nas linhas 231-361, remover import.

    2. **Substituir Row 1 (linhas 231-271) — codigo atual `<Grid container spacing={2} sx={{ alignItems: "stretch" }}>` + 3 Grid children (Produto, Data criacao, Data ultima alteracao) — NOTAR: HTML tem 4 colunas (Cod. + Produto + Data criacao + Data ultima alteracao), atual codigo tem apenas 3. Adicionar campo "Cod." como primeiro:**

    ```tsx
    <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 150px 175px', gap: 1.5, mb: 1.5 }}>
      <TextField
        fullWidth
        size="small"
        label="Cod."
        name="code"
        value={initialValues?.id ?? ""}
        slotProps={{ input: { readOnly: true } }}
        sx={{
          '& .MuiInputBase-input': { padding: '7px 10px', fontSize: 13 },
          '& .MuiInputLabel-root': { fontSize: 11, fontWeight: 500, color: '#5F5E5A' }
        }}
      />
      <TextField
        required
        fullWidth
        size="small"
        label="Produto"
        name="displayName"
        defaultValue={displayName}
        error={Boolean(getFieldError("displayName"))}
        helperText={getFieldError("displayName") ?? " "}
        sx={{
          '& .MuiInputBase-input': { padding: '7px 10px', fontSize: 13 },
          '& .MuiInputLabel-root': { fontSize: 11, fontWeight: 500, color: '#5F5E5A' }
        }}
      />
      <ReadonlyTextField label="Data de criacao" value={createdAtLabel} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <ReadonlyTextField label="Data e hora da ultima alteracao" value={updatedAtLabel} />
        {initialValues?.version !== undefined ? (
          <Box sx={{
            display: "inline-flex",
            alignSelf: "flex-start",
            bgcolor: "#E6F1FB",
            color: "#185FA5",
            fontSize: 11,
            fontWeight: 600,
            border: "0.5px solid #B5D4F4",
            borderRadius: "4px",
            px: 1,
            py: "2px",
            mt: "-8px"
          }} aria-label="Versao atual da ficha">
            V{initialValues.version}
          </Box>
        ) : null}
      </Box>
    </Box>
    ```

    3. **Substituir Row 2 (linhas 273-361) — `<Grid container spacing={2} sx={{ alignItems: "stretch" }}>` + 4 Grid children — por:**

    ```tsx
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 1fr', gap: 1.5 }}>
      <TextField required fullWidth size="small" select label="Modalidade" name="modalityId" value={modalityId} onChange={(e) => setModalityId(e.target.value)} error={Boolean(getFieldError("modalityId"))} helperText={getFieldError("modalityId") ?? " "} sx={{
        '& .MuiInputBase-input': { padding: '7px 10px', fontSize: 13 },
        '& .MuiInputLabel-root': { fontSize: 11, fontWeight: 500, color: '#5F5E5A' }
      }}>
        {modalityOptions.map((option) => (
          <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
        ))}
      </TextField>
      <TextField required fullWidth size="small" label="Grupo operacional" name="groupOperational" defaultValue={groupOperational} error={Boolean(getFieldError("groupOperational"))} helperText={getFieldError("groupOperational") ?? " "} sx={{
        '& .MuiInputBase-input': { padding: '7px 10px', fontSize: 13 },
        '& .MuiInputLabel-root': { fontSize: 11, fontWeight: 500, color: '#5F5E5A' }
      }} />
      <TextField required fullWidth size="small" select label="Status" name="status" defaultValue={initialValues?.status ?? "rascunho"} error={Boolean(getFieldError("status"))} helperText={getFieldError("status") ?? " "} sx={{
        '& .MuiInputBase-input': { padding: '7px 10px', fontSize: 13 },
        '& .MuiInputLabel-root': { fontSize: 11, fontWeight: 500, color: '#5F5E5A' }
      }}>
        <MenuItem value="rascunho">Rascunho</MenuItem>
        <MenuItem value="ativa">Ativa</MenuItem>
        <MenuItem value="inativa">Inativa</MenuItem>
        <MenuItem value="arquivada">Arquivada</MenuItem>
      </TextField>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A' }}>
          Custo atual da ficha
        </Typography>
        <Box sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 0.75,
          padding: '7px 12px',
          borderRadius: '6px',
          border: '0.5px solid #D3D1C7',
          background: '#E6F1FB'
        }}>
          <Typography component="span" sx={{ fontSize: 11, color: '#185FA5', fontWeight: 500 }}>R$</Typography>
          <Typography component="span" sx={{ fontSize: 18, color: '#185FA5', fontWeight: 600, lineHeight: 1 }}>
            {formatCurrency(linkedItem?.currentCost).replace(/R\$\s?/, "")}
          </Typography>
        </Box>
      </Box>
    </Box>
    ```

    4. **Nota sobre fontWeight 600 vs 700:** Atual codigo (linha 354) tem `fontWeight: 700`. Mudar para `600` per D-03 (HTML marca 600).

    5. **Nota sobre padding/border do box azul:** Atual usa `px: 1.5, py: 1` (= ~12px 8px) e `borderColor: "#B5D4F4"`. Mudar para `padding: '7px 12px'` e `border: '0.5px solid #D3D1C7'` per D-03 (HTML .custo-atual).

    6. Rodar tests — TODOS devem passar GREEN agora:
       ```bash
       npm run test:unit -- ficha-form
       npm run typecheck
       ```

    7. **COMMIT GREEN (separado per D-04):**
       ```bash
       git add src/modules/engineering/ui/ficha-form.tsx
       git commit -m "feat(09-03): refactor ficha identificacao to Box sx grid 1:1 HTML (D-01..D-03)"
       ```

    8. E2E gate (D-20):
       ```bash
       npm run test:e2e -- engineering-flow --workers=1
       ```
       Sem regressao.
  </action>
  <verify>
    <automated>grep -c "gridTemplateColumns: '110px 1fr 150px 175px'" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; grep -c "gridTemplateColumns: '1fr 1fr 120px 1fr'" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; grep -c "#E6F1FB" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; grep -c "padding: '7px 12px'" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; npm run test:unit -- ficha-form &amp;&amp; npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal `gridTemplateColumns: '110px 1fr 150px 175px'` (grep exact)
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal `gridTemplateColumns: '1fr 1fr 120px 1fr'` (grep exact)
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal `#E6F1FB` (grep)
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal `padding: '7px 12px'` OR `padding: "7px 12px"` (grep — Custo atual border)
    - `src/modules/engineering/ui/ficha-form.tsx` contains `fontSize: 18` AND `fontWeight: 600` (grep both, ideally in proximity — custo atual valor)
    - `src/modules/engineering/ui/ficha-form.tsx` does NOT contain `fontWeight: 700` associated with custo atual (grep — if 700 exists elsewhere, verify it is not in Identificacao bloco)
    - `src/modules/engineering/ui/ficha-form.tsx` does NOT contain `<Grid container` within Identificacao section (grep — scoped check via line range 220-370 if possible)
    - `npm run test:unit -- ficha-form` exits 0 (all GREEN)
    - `npm run typecheck` exits 0
    - `npm run test:e2e -- engineering-flow --workers=1` sem regressao vs baseline
    - Git log: 2 commits separados: `test(09-03): add RED` + `feat(09-03): refactor ficha identificacao` (verify with `git log --oneline -10`)
  </acceptance_criteria>
  <done>
    Bloco Identificacao usa Box sx CSS grid literal + Custo atual com tokens HTML; tests GREEN; commits RED/GREEN separados.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| UI visual refactor | Nenhum novo input de dados, nenhuma mudanca de contrato server action |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-03-01 | — | Visual refactor only | accept | No new attack surface — grid container swap (MUI Grid -> Box sx); fields preservados (name, defaultValue, error, helperText) — serializacao identica para saveFichaAction. |
</threat_model>

<verification>
- Source ficha-form.tsx contem literal gridTemplateColumns '110px 1fr 150px 175px' e '1fr 1fr 120px 1fr'
- Source contem #E6F1FB + padding '7px 12px' + fontSize 18 + fontWeight 600 (custo atual)
- Labels renderizados: Cod., Produto, Data de criacao, Data e hora da ultima alteracao, Modalidade, Grupo operacional, Status, Custo atual da ficha
- npm run test:unit -- ficha-form exits 0 (GREEN)
- npm run typecheck exits 0
- npm run test:e2e -- engineering-flow --workers=1 sem regressao (gate D-20)
- Git log mostra 2 commits separados RED + GREEN (D-04)
</verification>

<success_criteria>
1. ficha-form.tsx Identificacao usa Box sx CSS grid literal (110px 1fr 150px 175px + 1fr 1fr 120px 1fr).
2. Custo atual com tokens HTML exatos (#E6F1FB, padding 7px 12px, fontSize 18, fontWeight 600).
3. Labels exatos na ordem do HTML.
4. RED commit + GREEN commit separados (D-04).
5. Unit + typecheck + E2E subset estavel verdes.
6. ComponentsEditor + Finalizacao nao afetados (props preservados).
</success_criteria>

<output>
After completion, create `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md` documenting:
- RED commit SHA + tests adicionados
- GREEN commit SHA + refactor diff (Grid → Box sx)
- Hex tokens aplicados (#E6F1FB, etc)
- Gates passados (unit, typecheck, E2E)
- Nenhum campo novo adicionado (apenas Cod. surfando como campo readonly derivado de initialValues.id)
</output>
