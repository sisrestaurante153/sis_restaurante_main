# Persistencia Real E Fechamento De Qualidade

## Contexto

O projeto ja possui dominio, schema Prisma, importacao legada, autenticacao, auditoria parcial e interface web. O gap principal esta na camada de aplicacao: catalogo, fichas e pendencias de importacao ainda dependem do store demo em memoria, o que impede validar os fluxos mandatórios com PostgreSQL, recálculo persistido e rastreabilidade ponta a ponta.

## Objetivo

Concluir a primeira entrega operacional migrando os casos de uso centrais para Prisma, mantendo fallback apenas como bootstrap degradado, e fechar a qualidade com seed real, testes de integração, smoke e2e, reset local e documentação de homologação/riscos.

## Abordagem Escolhida

1. Repositórios de catalogo, engenharia e importacao passam a priorizar Prisma e retornam o mesmo contrato já consumido pela UI.
2. `saveItem` recalcula snapshots e cascata quando custo ou conversao mudam.
3. `saveFicha`, `duplicateFicha` e `inactivateFicha` persistem versionamento, bloqueio de ciclo, dependencia transitiva, snapshots de custo e auditoria.
4. As páginas continuam server-first no App Router, sem mover a logica de consulta para o cliente.
5. O seed passa a materializar uma cadeia completa `insumo -> pre_preparo -> intermediario -> produto_pronto -> prato -> porcao -> marmita -> combo -> embalagem/apoio`, mais conflitos de importacao e auditoria.

## Limites E Decisoes

- O item mestre continua sendo a fonte canonica de nome/tipo; a ficha usa o item vinculado em vez de manter cadastro paralelo.
- O fallback demo permanece somente para inicializacao sem banco acessivel; os testes de integração e e2e obrigatórios rodam sempre contra PostgreSQL.
- O cálculo expandido será lido preferencialmente do último `calculo_execucao.metadados_json`, evitando recomputar a árvore em cada leitura.
- Unidades livres digitadas na UI serão normalizadas para `unidade_medida`, com inferência simples de tipo (`massa`, `volume`, `contagem`) e conversões item-específicas quando necessário.

## Entregas

- Repositórios Prisma para catalogo, fichas, composição, custo e pendencias de importacao.
- Recalculo em cascata acionado por alteração de compra e por ativação/edição de ficha.
- Testes de domínio, integração de banco e e2e cobrindo os 10 fluxos obrigatórios.
- Seed expandido, script de reset local, checklist de homologação e relatório de cobertura/riscos.
