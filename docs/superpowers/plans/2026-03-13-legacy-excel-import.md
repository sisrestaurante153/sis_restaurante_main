# Legacy Excel Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a importação do workbook legado para o modelo novo com parsing resiliente, reconciliação automática e fila de conflitos.

**Architecture:** O parsing fica em Python com `openpyxl`, produzindo staging em JSON e relatórios de importação. A persistência no banco usa Prisma via script TypeScript, preservando rastreabilidade por linha/origem e registrando conflitos sem reconciliar casos ambíguos.

**Tech Stack:** Python 3 + openpyxl + pytest, TypeScript + Prisma, JSON/Markdown para staging e reports.

---

## Chunk 1: Parsing e normalização

### Task 1: Esqueleto do parser legado

**Files:**
- Create: `scripts/importers/legacy_excel/__init__.py`
- Create: `scripts/importers/legacy_excel/workbook.py`
- Create: `scripts/importers/legacy_excel/normalize.py`
- Create: `scripts/importers/legacy_excel/parsers/*.py`
- Test: `tests/python/test_parser_real_samples.py`

- [ ] Escrever testes vermelhos para classificar abas reais e detectar pendências conhecidas.
- [ ] Implementar leitura do workbook e detectores de família de aba.
- [ ] Implementar normalização de nomes/unidades e heurísticas de confiança.
- [ ] Gerar staging e conflitos em JSON.

## Chunk 2: Carga Prisma

### Task 2: Persistência do staging

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/load-legacy-import.ts`
- Create: `src/modules/import/domain/*.ts`

- [ ] Adicionar tabelas de staging/conflito necessárias para rastreabilidade.
- [ ] Implementar loader Prisma que upserta itens, aliases, fichas e conflitos.
- [ ] Garantir isolamento dos casos não reconciliados.

## Chunk 3: Relatório e validação

### Task 3: Execução fim a fim

**Files:**
- Create: `artifacts/imports/.gitkeep`
- Create: `docs/import/legacy-import.md`

- [ ] Emitir relatório markdown/json por execução.
- [ ] Rodar testes Python e TypeScript.
- [ ] Validar a execução com a planilha real.
