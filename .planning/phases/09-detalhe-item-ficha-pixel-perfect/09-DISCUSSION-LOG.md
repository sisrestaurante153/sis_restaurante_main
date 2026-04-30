# Phase 9: Telas de detalhe Item e Ficha Tecnica pixel-perfect com HTML - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 09-detalhe-item-ficha-pixel-perfect
**Areas discussed:** Ficha Identificacao refactor; Topbar Ficha + Version badge + Finalizacao; Schema/API/Zod gap audit; Item form retoque + topbar; Testes pixel-perfect + ordem dos planos.

---

## Area Selection (gray areas multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Ficha Identificacao — refactor | MUI Grid\u2192CSS grid inline 110/1fr/150/175 + 1fr/1fr/120/1fr estilo Phase 8 D-09 | \u2713 |
| Topbar Ficha + Version badge | Duplicar/Exportar + badge ativa + V{n} positioning + Finalizacao layout | \u2713 |
| Schema/API/Zod gap audit | Auditar campos HTML vs Prisma/Zod/presenter/actions | \u2713 |
| Item form retoque + topbar | item-form.tsx FormSection + page.tsx /itens topbar | \u2713 |

**Followup:** Tests+order \u2014 "Sim, discutir testes e ordem" \u2713

---

## Ficha Identificacao — refactor

### Q1: Como abordar o refactor do bloco Identificacao da ficha?

| Option | Description | Selected |
|--------|-------------|----------|
| Substituir MUI Grid por Box sx grid (Recomendado) | Phase 8 D-09 pattern: Box display:grid gridTemplateColumns literal | \u2713 |
| Manter MUI Grid, ajustar sx/size | Preservar Grid 12-col, tunar breakpoints | |
| Reescrever como componente flat dedicado | <FichaIdentificationGrid> novo componente | |

**User's choice:** Substituir MUI Grid por Box sx grid.
**Notes:** Consistencia com item-form + testabilidade via grep do source + zero drift em resolucoes.

### Q2: Como tratar os campos de input da Identificacao?

| Option | Description | Selected |
|--------|-------------|----------|
| MUI TextField com sx override (Recomendado) | Preservar acessibilidade + useActionState + testes | \u2713 |
| Native input+select com CSS classes | Pixel-perfect maximo mas quebra muita infra | |
| Hibrido: flat vira native, resto MUI | FichaFlatGrid ja native; resto MUI | |

**User's choice:** MUI TextField com sx override.
**Notes:** Pixel-perfect suficiente com sx; nao vale custo de migrar inputs.

### Q3: Custo atual da ficha — box azul paddings/border exatos do HTML?

| Option | Description | Selected |
|--------|-------------|----------|
| Alinhar pixel-perfect ao HTML (Recomendado) | padding 7px 12px, borderRadius 6px, font 18/600 azul | \u2713 |
| Aceitar aproximacao atual | px:1.5, py:1 atual ja proximo visualmente | |

**User's choice:** Alinhar pixel-perfect.
**Notes:** Entra no VERIFICATION checklist.

### Q4: Preservacao dos testes existentes durante refactor?

| Option | Description | Selected |
|--------|-------------|----------|
| TDD: RED guard antes de refactor (Recomendado) | Task 1 RED valida contratos + Task 2 GREEN refator + legados | \u2713 |
| Refactor direto + adaptar testes quebrados | Mais rapido, arrisca regressao sem cobertura | |

**User's choice:** TDD RED\u2192GREEN.
**Notes:** Padrao Phase 8 consolidado. Commits separados.

---

## Topbar Ficha + Version badge + Finalizacao

### Q1: Botoes Duplicar + Exportar no topbar da Ficha: incluir?

| Option | Description | Selected |
|--------|-------------|----------|
| Incluir estrutura visual, sem handler (Recomendado) | Render btn-icon + SVG exato; handler TODO | \u2713 |
| Incluir com handlers funcionais | Fora de escopo (PDF export em roadmap v2) | |
| Nao incluir \u2014 skip | Aceita gap vs HTML | |

**User's choice:** Estrutura visual sem handler.
**Notes:** Sem scope creep para v2.

### Q2: Badge "ativa" inline + subtitulo "Edicao da ficha tecnica principal." \u2014 pixel-perfect?

| Option | Description | Selected |
|--------|-------------|----------|
| Alinhar pixel-perfect ao HTML (Recomendado) | Confirmar .badge tokens + subtitulo 12px #888780 | \u2713 |
| Apenas validar \u2014 sem mudanca | Se TopBar ja foi alinhado em fases anteriores, skip | |

**User's choice:** Alinhar pixel-perfect.
**Notes:** Entra no checklist.

### Q3: Version badge V{n} \u2014 manter, mover ou remover?

| Option | Description | Selected |
|--------|-------------|----------|
| Manter posicionamento atual (Recomendado) | Pendencias-v3 #14 ja aceito; HTML v2 nao contradiz | \u2713 |
| Mover para Quadro Final como .ver-badge | Mais fiel HTML mas quebra acceptance | |
| Remover do cabecalho | Regressao pendencias-v3 #14 | |

**User's choice:** Manter posicionamento atual.
**Notes:** Nao regredir acceptance do cliente ganho em pendencias-v3 prevalece.

### Q4: Bloco Finalizacao — ajustes?

| Option | Description | Selected |
|--------|-------------|----------|
| 2-col 50/50 + ambos opcionais (Recomendado) | Layout g-fin + preparationMode optional + Zod relax | \u2713 |
| Manter preparationMode required, so layout | Zero mudanca server-side mas diverge HTML | |
| Skip \u2014 divergencia aceitavel | Fora de pixel-perfect prioritario | |

**User's choice:** 2-col 50/50 + ambos opcionais + Zod relax.
**Notes:** Zod preparationMode: z.string().default('').

---

## Schema / API / Zod gap audit

### Q1: Schema Prisma \u2014 campo novo necessario para suportar HTMLs?

| Option | Description | Selected |
|--------|-------------|----------|
| Auditoria formal sem migration (Recomendado) | Checklist HTML\u2194Prisma\u2194Zod\u2194presenter; migration so se gap | \u2713 |
| Audit + migration proativa mesmo sem gap | Forca trabalho desnecessario | |
| Skip audit \u2014 assumir zero gap | Viola goal #2 | |

**User's choice:** Auditoria formal sem migration.
**Notes:** Scout sugere zero gap novo pos Phase 8; audit formaliza.

### Q2: Zod/presenter: preparationMode required\u2192optional \u2014 blast radius?

| Option | Description | Selected |
|--------|-------------|----------|
| Relaxar Zod + preservar coluna NOT NULL default '' (Recomendado) | Zero migration, zero breakage | \u2713 |
| Zod opcional + coluna nullable | Requer migration | |
| Manter required | Diverge HTML, conflita com D-08 | |

**User's choice:** Relaxar Zod + coluna NOT NULL com default ''.
**Notes:** Minimo blast radius.

### Q3: ItemCompra.priceUpdatedAt \u2014 "Atualizado em" HTML: persistido?

| Option | Description | Selected |
|--------|-------------|----------|
| Validar que ja persiste (Recomendado) | Scout confirma coluna; so validar render dd/mm/yyyy | \u2713 |
| Auto-preencher no save | Fora de escopo, ideia de UX | |

**User's choice:** Validar que ja persiste.
**Notes:** Placeholder "dd/mm/aaaa" quando null.

### Q4: Migrations \u2014 zero migration se auditoria passar clean?

| Option | Description | Selected |
|--------|-------------|----------|
| Declarar 'zero migration' no VERIFICATION (Recomendado) | Satisfaz goal #3 trivialmente | \u2713 |
| Forcar migration de teste | Nao faz sentido sem gap real | |

**User's choice:** Declarar zero migration no VERIFICATION.

---

## Item form retoque + topbar

### Q1: FormSection wrapper vs .card raso do HTML?

| Option | Description | Selected |
|--------|-------------|----------|
| Remover description, preservar title (Recomendado) | Minor refactor FormSection; card-label bate 1:1 | \u2713 |
| Substituir FormSection por Box raso | Blast radius 3 Item + 3 Ficha + outros | |
| Manter description \u2014 divergir do HTML | Conflita pixel-perfect goal | |

**User's choice:** Remover description, preservar title.

### Q2: Topbar Item \u2014 pixel-perfect hex+padding?

| Option | Description | Selected |
|--------|-------------|----------|
| Validar + alinhar (Recomendado) | btn-danger #F09595/#A32D2D, btn-primary #185FA5, padding 8px 18px | \u2713 |
| Assumir ja aderente | Risco drift em hover + padding | |

**User's choice:** Validar + alinhar.

### Q3: Placeholders do HTML em /itens/novo?

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholders do HTML (Recomendado) | dd/mm/aaaa, 0,0000, R$ 0,00, textarea exemplo Arroz | \u2713 |
| Placeholders neutros | Menos fiel | |

**User's choice:** Placeholders do HTML.

### Q4: Badge ativo/inativo \u2014 contrato de cor?

| Option | Description | Selected |
|--------|-------------|----------|
| Usar tokens HTML verde/cinza (Recomendado) | Ativo #EAF3DE/#1B6B2C; Inativo #F4F4F2/#888780 | \u2713 |
| Skip \u2014 ja aceitavel | Se string simples, aceitar | |

**User's choice:** Tokens HTML verde/cinza.
**Notes:** Evita vermelho (reservado para erro).

---

## Testes pixel-perfect + ordem dos planos

### Q1: Spec pixel-perfect para detail pages \u2014 estender ou novo?

| Option | Description | Selected |
|--------|-------------|----------|
| Estender pixel-perfect-phase8.spec.ts (Recomendado) | Single source of truth + reusa helpers; goal #6 cita explicit | \u2713 |
| Criar pixel-perfect-phase9.spec.ts dedicado | Isolamento mas duplicacao | |
| So checklist manual | Contraria Phase 8 D-15 | |

**User's choice:** Estender pixel-perfect-phase8.spec.ts.

### Q2: Ordem dos planos \u2014 como sequenciar?

| Option | Description | Selected |
|--------|-------------|----------|
| Schema audit primeiro \u2192 Item paralelo Ficha \u2192 Testes (Recomendado) | Wave 1 audit; Wave 2 paralelo 3 planos; Wave 3 testes. Phase 8 D-19 pattern | \u2713 |
| Ficha primeiro \u2192 Item \u2192 Testes | Sequencial, perde paralelismo | |
| Tudo paralelo \u2014 so testes no fim | Arrisca merge conflicts audit vs UI | |

**User's choice:** Wave-based (audit \u2192 paralelo \u2192 testes).

### Q3: Quantidade de planos?

| Option | Description | Selected |
|--------|-------------|----------|
| 5 planos (Recomendado) | 09-01 audit, 09-02 Item, 09-03 Ficha Ident, 09-04 Ficha topbar+final, 09-05 testes | \u2713 |
| 3 planos (consolidado) | Planos maiores, TDD mais dificil | |
| 7+ planos (granular) | Excesso orquestracao | |

**User's choice:** 5 planos.

### Q4: E2E gates \u2014 quando?

| Option | Description | Selected |
|--------|-------------|----------|
| Apos cada plano + gate final (Recomendado) | Padrao Phase 8 D-16, workers=1 Windows | \u2713 |
| Apenas no gate final | Regressoes acumuladas | |

**User's choice:** Apos cada plano + gate final.

---

## Claude's Discretion

- Nome exato das FormSection titles (microcopy preservado se ja bate HTML).
- Gap exato no Box sx (1.5 vs 1.75 vs 14px literal) — escolha visual equivalente ao HTML `.row { gap: 14px }`.
- Ordem interna do TDD no plano 09-03 (1 commit RED unico vs 2 separados).
- Estilo do onClick handler stub Duplicar/Exportar (`() => undefined` vs comment TODO).
- title vs aria-label nos btn-icon.
- Formato exato da tabela HTML\u2194Prisma do audit (markdown vs JSON).

## Deferred Ideas

- Handler real de Duplicar ficha (Phase 10 candidate).
- Handler real de Exportar (roadmap v2 PDFV2-FUT-01).
- Mover V{n} para .ver-badge gold do Quadro Final (conflita pendencias-v3 #14).
- Substituir FormSection por Box className="card" em toda app (blast radius alto, design system refactor).
- Trigger auto-update ItemCompra.priceUpdatedAt (ideia UX).
- Migrar inputs para native element em toda app (v2 se pedido).
- Playwright visual regression screenshot diff.
- Drop fisico colunas legadas item.unidade_*.
- Renomear ItemCompra \u2192 ItemFornecedor.
