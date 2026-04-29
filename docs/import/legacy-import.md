# Importação do Excel Legado

## Pipeline

1. Parsing em Python com `openpyxl`:

```bash
npm run import:legacy:parse
```

2. Carga no banco com Prisma:

```bash
npm run import:legacy:load -- artifacts/imports/test-run/report.json
```

## Artefatos gerados

- `artifacts/imports/<run>/report.json`
- `artifacts/imports/<run>/report.md`
- `artifacts/imports/<run>/conflicts.json`
- `artifacts/imports/<run>/staging/items.json`
- `artifacts/imports/<run>/staging/recipes.json`
- `artifacts/imports/<run>/staging/weights.json`
- `artifacts/imports/<run>/load-result.json`

## Heurísticas atuais

- `TABELA VMARKET` e `EMBALAGENS` são tratados como base de cadastro e custo.
- `PESOS` é lido como tabela auxiliar de tamanhos.
- Abas com `Ficha Técnica`, `Produto` e `Ingredientes` são tratadas como fichas.
- A classificação entre `recipe` e `final_composition` usa o nome da aba, o produto e padrões de código/título.
- Reconciliação automática só ocorre em match exato ou alta confiança.
- Divergência de unidade sem compatibilidade conhecida vira conflito.
- Pendências forçadas:
  - `Batata lavada  graúda  un aproxim. 350g`
  - `Bicarbonato`
