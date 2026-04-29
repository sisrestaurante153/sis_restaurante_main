# Legacy Excel Import Design

## Contexto

O workbook legado tem 325 abas, layout inconsistente e divergências de nome/unidade. A importação precisa ler essa planilha de forma resiliente, produzir reconciliação automática quando a confiança for alta, isolar conflitos para revisão manual e preservar rastreabilidade da origem Excel.

## Decisão

Implementar a importação em duas fases:

1. Parser Python com `openpyxl` para leitura, detecção de famílias de aba, normalização, reconciliação e geração de staging/report.
2. Loader em TypeScript com Prisma para consumir o staging e persistir no modelo novo.

## Razões

- `openpyxl` é a ferramenta mandatória e adequada para ler um workbook heterogêneo.
- Separar parsing de persistência reduz acoplamento entre layout legado e schema do produto.
- O staging intermediário em JSON deixa a importação auditável, reproduzível e testável sem depender do banco em toda execução.

## Estrutura prevista

- `scripts/importers/legacy_excel/`: parser Python, normalização, heurísticas e geração de report.
- `scripts/load-legacy-import.ts`: carga Prisma do staging para o banco.
- `artifacts/imports/<run-id>/`: report markdown/json, conflitos e staging consolidado.
- `tests/python/`: testes do parser usando amostras reais da planilha.

## Invariantes

- Nenhum conflito ambíguo é importado automaticamente para o item mestre.
- Casos pendentes conhecidos entram sempre na fila manual.
- Toda linha importada carrega referência de aba, linha e tipo de origem.
- Divergência de unidade sem conversão confiável vira conflito.
