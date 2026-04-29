# Modelo de Dados e Cardinalidade

## ER textual

### Núcleo de item e composição

- `item (1) -> (N) item_alias`
- `item (1) -> (N) conversao_unidade`
- `unidade_medida (1) -> (N) conversao_unidade` como origem
- `unidade_medida (1) -> (N) conversao_unidade` como destino
- `item (1) -> (N) item_compra`
- `fornecedor (1) -> (N) item_compra`
- `unidade_medida (1) -> (N) item_compra`
- `item (1) -> (N) ficha_tecnica` como item resultante versionado
- `ficha_tecnica (1) -> (N) ficha_componente`
- `item (1) -> (N) ficha_componente` como item componente
- `unidade_medida (1) -> (N) ficha_componente`
- `item (1) -> (N) custo_snapshot_item`
- `item (1) -> (N) calculo_execucao` como item recalculado
- `item (1) -> (N) calculo_execucao` como item gatilho opcional
- `item (1) -> (N) dependencia_item` como ascendente
- `item (1) -> (N) dependencia_item` como descendente
- `calculo_execucao (1) -> (N) calculo_componente_snapshot`
- `calculo_execucao (1) -> (N) custo_snapshot_item`

### Acesso e auditoria

- `usuario (N) <-> (N) role` via `usuario_role`
- `role (N) <-> (N) permissao` via `role_permissao`
- `usuario (1) -> (N) ficha_tecnica` como autor da versão
- `usuario (1) -> (N) auditoria`

## Invariantes de domínio

1. `item.nome_normalizado` é único e representa o cadastro mestre canônico.
2. `item_alias.alias_normalizado` é único por item; aliases resolvem divergência legada sem duplicar item mestre.
3. `item_compra` é único por combinação de item, fornecedor e unidade de compra.
4. `ficha_tecnica` é única por combinação de item resultante e versão.
5. Existe no máximo uma ficha `ativa` por item resultante; isso é reforçado por índice parcial na migration.
6. `ficha_componente.ordem` é única dentro da ficha.
7. `dependencia_item` funciona como closure table:
   - profundidade `0` representa o próprio item
   - profundidade `1` representa dependência direta
   - profundidade `>1` representa dependência transitiva
8. Ciclos não são aceitos na composição; a regra é aplicada na camada de domínio antes de persistir.
9. `modo_rendimento` aceita exatamente uma estratégia:
   - `percentual_perda` exige `percentual_perda` e proíbe `peso_final_informado`
   - `peso_final` exige `peso_final_informado` e proíbe `percentual_perda`
10. Quantidades, fatores e custos relevantes usam `NUMERIC` via `@db.Decimal(...)` para evitar erro de ponto flutuante.
11. Cada recálculo persistido gera uma `calculo_execucao`, snapshots diretos por componente e um novo `custo_snapshot_item`.
12. `custo_snapshot_item` guarda o estado consolidado do item; `calculo_componente_snapshot` guarda a trilha direta do lote calculado.

## Como `dependencia_item` suporta impacto e recálculo

- Quando um insumo muda de custo, consulta-se `dependencia_item` por `item_descendente_id = <insumo alterado>` e `profundidade > 0`.
- Os itens `ascendentes` retornados representam tudo o que deve ser recalculado em cascata.
- A presença de linhas de profundidade `0` simplifica rebuild completo e consultas de alcance.

## Trilha de cálculo

- `calculo_execucao` representa uma execução atômica de cálculo ou recálculo.
- `custo_anterior` e `custo_novo` registram o delta consolidado do item.
- `calculo_componente_snapshot` registra custo direto, herdado, fator equivalente e impacto percentual de cada componente direto.
- O breakdown expandido permanece serializado em `calculo_execucao.metadados_json` para inspeção histórica.
