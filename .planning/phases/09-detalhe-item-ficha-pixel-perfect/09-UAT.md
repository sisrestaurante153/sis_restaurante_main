---
status: partial
phase: 09-detalhe-item-ficha-pixel-perfect
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md, 09-05-SUMMARY.md]
started: 2026-04-19T23:06:35.699Z
updated: 2026-04-19T23:59:00.000Z
---

## Current Test

number: 3
name: Tela de nova Ficha (/fichas/nova)
expected: |
  Main content area renderiza com FichaForm visivel. Apos captura automatizada via
  Playwright, screenshot mostra sidebar renderizada mas area de conteudo 100% em branco
  em 1440x2583 full-page. Possivel regressao de ficha-form.tsx (Phase 9-03 ou 9-04) —
  precisa ser reproduzido apos restart do dev server Next.js para descartar instabilidade
  do Jest worker (servidor dev crashou com "Jest worker encountered 2 child process exceptions,
  exceeding retry limit" durante a captura).
awaiting: user response (dev server restart needed)

## Tests

### 1. Cold Start Smoke Test
expected: Suba o ambiente do zero. Next.js sobe sem erro, home carrega, /itens e /fichas listam dados. Mudanca em ficha-form-schema.ts nao quebrou boot.
result: partial
evidence: |
  Dev server (npm run dev) respondeu 307 → /login em 2.7s; /itens 200 em 3.7s. Login via
  Playwright (admin@sis-restaurante.local / admin123) teve sucesso. Demo fallback ativado
  (Docker postgres off). Porem apos 2-3 navegacoes o Next.js dev trava com "Jest worker
  encountered 2 child process exceptions, exceeding retry limit" e ate /login comeca a dar
  timeout de 5min+. Restart do dev server recupera por ~3 minutos, e trava de novo. Mesmo
  padrao reproduzido 3x.
blocked_by: dev-server-instability
issue_severity: medium
note: Instabilidade do dev Next.js — nao e bug da Phase 9, mas impede UAT automatizada. Suite E2E real (Docker) vai rodar em ambiente separado.

### 2. Tela de edicao de Item (/itens/[id]) vs update/tela-item-v1.html
expected: |
  Abrir qualquer item existente em /itens/[id]. Comparar lado a lado com update/tela-item-v1.html:
  - Topbar: botao Salvar fundo #185FA5, botao Desativar borda #F09595 texto #A32D2D (quando ativo)
  - Badge de status ao lado do titulo: "Ativo" verde (#EAF3DE bg, #1B6B2C texto) OU "Inativo"
    cinza neutro (#F4F4F2 bg, #888780 texto) — nunca vermelho
  - Bloco Identificacao: 3 FormSection (Identificacao, Detalhamento de Compras, Observacoes);
    Identificacao SEM subtitulo/description abaixo do titulo
  - Bloco Compras: PurchasesEditor com 1 fornecedor principal editavel
  Layout geral bate 1:1 com o HTML.
result: pending

### 3. Tela de novo Item (/itens/novo) vs update/tela-item-v1.html
expected: |
  Abrir /itens/novo. Topbar: botao Salvar #185FA5. StickyActionBar (barra fixa inferior):
  botao principal #185FA5 hover #0C447C. Formulario vazio pronto para preenchimento com os
  mesmos 3 FormSection da tela de edicao.
result: issue
evidence_screenshot: docs/qa/screenshots-phase9/02-itens-novo.png
observed: |
  Screenshot mostra o layout pixel-perfect esperado (3 FormSection, topbar correto, Salvar
  item azul #185FA5, Identificacao sem description, placeholders dd/mm/aaaa + 0,0000 + R$ 0,00
  todos corretos). PORÉM há overlap visual nos 2 <TextField select> da Row 2 de Identificacao:
  labels "Tipo" e "Categoria operacional (Secao)" nao estão flutuando (shrink=true) quando
  defaultValue presente — rendered texto sobrepoe ("Insumo" overlap label "Tipo"; "Cozinha
  quente" overlap label "Categoria operacional"). Gap pre-existente do Phase 8-04 (row 2
  introduzida la), NAO causado por Phase 9-02.
issue_severity: low
issue_type: visual-pre-existing
tracking: deferred-items.md (a criar)

### 4. Fornecedor 2+ na tela de Item (placeholders + badge fixado)
expected: |
  Em /itens/[id], adicionar um segundo fornecedor no bloco Compras. Card do secundario:
  - Placeholders visiveis quando vazio: "dd/mm/aaaa" no campo Data, "0,0000" em Qtde,
    "R$ 0,00" em Preco
  - Campos Unidade/Qtde/Preco de uso aparecem READONLY em verde (#F0F7E8 bg, #C0DD97 border)
    com badge "fixado do 1o fornecedor"
  - Botao "Tornar principal" disponivel
  - Card principal fica neutro (#FAFAF9 + divider)
result: pending

### 5. Tela de edicao de Ficha (/fichas/[id]) vs update/tela-ficha-tecnica-v2.html — topbar + Identificacao + Finalizacao
expected: |
  Abrir qualquer ficha em /fichas/[id]. Comparar com tela-ficha-tecnica-v2.html:
  - Topbar: 2 botoes btn-icon lado a lado — Duplicar (SVG 2 retangulos) e Exportar (SVG download).
    Tokens btn-icon: padding 7px 10px, border 0.5px solid #D3D1C7, radius 6px, bg #fff, cor #5F5E5A.
    Exportar por enquanto nao baixa nada (TODO), mas aparece visualmente.
  - Badge "ativa" inline no titulo da pagina: fundo #EAF3DE texto #1B6B2C fonte 11px peso 500
    radius 20px
  - Bloco Identificacao — 2 linhas:
    Linha 1: Cod. (110px) | Produto (flex) | Data criacao (150px) | Data/hora ultima alteracao (175px)
    Linha 2: Modalidade | Grupo operacional | Status (120px) | Custo atual — 4 colunas 1fr 1fr 120px 1fr
  - Caixa "Custo atual da ficha": fundo azul claro #E6F1FB, texto #185FA5, fonte 18px peso 600
  - Bloco Finalizacao (no fim do form): 2 colunas 50/50, ambos campos marcados "(opcional)",
    com placeholders do HTML
  - Version badge V{n} polido (fundo #E6F1FB texto #185FA5 border #B5D4F4)
  - MUI Grid classico removido — layout usa CSS grid nativo
result: pending

### 6. Tela de nova Ficha (/fichas/nova) vs update/tela-ficha-tecnica-v2.html
expected: |
  Abrir /fichas/nova. Mesma estrutura da tela de edicao (itens 5) porem sem badge "ativa"
  nem version badge V{n} (ficha nao existe ainda). Topbar com botoes btn-icon desabilitados
  ou ocultos (nao ha item para duplicar/exportar). Botao Salvar do StickyActionBar com
  tokens hex #185FA5 / hover #0C447C.
result: pending

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

### Gap-1: MUI Select label nao flutua em Identificacao Row 2 (/itens/novo)
status: observed
severity: low
screen: /itens/novo (screenshot 02-itens-novo.png)
fields: Tipo, Categoria operacional (Secao)
root-cause-hypothesis: |
  MUI TextField select com defaultValue nao aciona InputLabel shrink, entao o label fica sobre
  o valor. Pre-existente ao Phase 9 (Row 2 introduzida em 08-04). Fix provavel:
  InputLabelProps={{ shrink: true }} ou controlar como state.
owner: phase 9.1 ou backlog

### Gap-2: /fichas/nova renderiza em branco (area principal)
status: inconclusive
severity: high-if-reproducible
screen: /fichas/nova (screenshot 03-fichas-nova.png)
evidence: |
  Screenshot full-page 1440x2583 mostra apenas sidebar + email footer; area principal totalmente
  branca. 15/15 unit tests de ficha-form.test.tsx passam; typecheck clean. Capturado durante
  instabilidade do dev server (Jest worker crash). Reproduzir apos restart estável do dev OU
  em ambiente Docker antes de marcar como bug.
blocked_by: dev-server-instability
next-action: |
  Reiniciar Next.js dev (kill PID atual, npm run dev), aguardar first-load de /login+/fichas/nova
  individualmente (sem batch), recapturar. Se reproduzir → abrir plan 9.1 para investigar
  ficha-form SSR render. Se nao reproduzir → marcar Gap-2 resolvido (instabilidade do dev).

### Gap-3: Telas de edicao (/itens/[id], /fichas/[id]) nao capturadas
status: blocked
severity: n/a (bloqueio, nao bug)
blocked_by: dev-server-instability
next-action: mesma acao do Gap-2 — reiniciar dev, recapturar isoladamente.
