# Repository Guidelines

## Project Context
Este repositório define um sistema web de ficha tecnica para restaurante que deve substituir o Excel legado por uma aplicacao com cadastro unico de itens, composicao recursiva, calculo de custo/rendimento, login, banco relacional e deploy self-hosted.

A planilha `fichas-tecnicas-produtos-oficial.xlsx` deve ser tratada como fonte legada de importacao e conferencia, nunca como modelo final da aplicacao. O backend deve concentrar o motor de custo, rendimento, rastreabilidade e recalculo em cascata.

## Legacy Base Facts
- A base possui 325 abas.
- `TABELA VMARKET` e base de preco/custo e indice de saidas calculadas.
- `EMBALAGENS` contem 31 itens operacionais.
- `PESOS` consolida tamanhos P, M e G.
- Existem cerca de 175 insumos-base, 30 itens processados, 115 produtos finais em kg, 149 abas de receitas/componentes e 172 abas de composicao final.
- Foram identificadas 1446 referencias de ingredientes e 418 referencias de embalagens/itens operacionais.
- Ha pelo menos 4 transformacoes em cadeia no modelo atual.
- Existem 207 divergencias de nomes e 277 usos com unidade diferente da unidade-base de compra, distribuidos em 58 itens.

## Mandatory Stack
- Monolito modular web.
- Next.js 15, React 19 e TypeScript.
- PostgreSQL.
- Prisma ORM com SQL tipado ou SQL pontual para recursao.
- Tailwind CSS e shadcn/ui.
- Autenticacao com sessao segura.
- Vitest e Playwright.
- Docker Compose.
- Python com `openpyxl` apenas para importacao/migracao da planilha.

## Architecture Constraints
- Nao usar microservicos, low-code, Firebase/Firestore ou planilha como banco.
- Nao separar frontend e backend em repositorios diferentes.
- Nao limitar profundidade da arvore de composicao.
- Nao limitar quantidade de componentes por ficha.
- Nao modelar prato, marmita e pre-preparo em estruturas desconectadas.
- Nao copiar bugs ou inversoes visuais do Excel para a aplicacao.

## Domain Model
O dominio deve usar uma tabela unica de `item` com perfis/tipos sobre ela. Entidades centrais obrigatorias: `item`, `item_alias`, `unidade_medida`, `conversao_unidade`, `item_compra`, `fornecedor`, `ficha_tecnica`, `ficha_componente`, `custo_snapshot_item`, `dependencia_item`, `auditoria` e estrutura de `usuario/role/permissao`.

Tipos principais de item: `insumo`, `pre_preparo`, `intermediario`, `produto_pronto`, `prato`, `porcao`, `marmita`, `combo`, `embalagem` e `apoio`.

Qualquer item pode compor outro item desde que nao gere ciclo, respeite compatibilidade minima de unidade e use ficha ativa quando for item composto.

## Business Rules
1. Tudo nasce de um item mestre; nao criar cadastros separados por modulo.
2. A composicao e recursiva e com profundidade ilimitada.
3. A ficha deve aceitar perda por percentual ou peso final informado.
4. O custo resultante deve ser calculado com base no peso util final.
5. Mudanca no custo de insumo deve disparar recalculo em cascata dos ascendentes.
6. O sistema deve exibir custo proprio, custo herdado, composicao expandida, impacto por componente e data do ultimo calculo.
7. Separar unidade de compra, estoque e uso; exigir fator de conversao quando necessario.
8. Embalagens e itens operacionais entram na mesma arvore de composicao como custo.
9. Fichas tecnicas precisam de versionamento, historico e bloqueio de sobrescrita silenciosa.
10. A importacao do legado deve guardar origem dos registros e gerar relatorio de conflitos.

## Agent Operating Context
Ao trabalhar neste repositorio, opere apenas dentro da pasta do projeto, deixe o ambiente executavel localmente e registre decisoes tecnicas no proprio repositorio. O produto deve suportar o fluxo completo `insumo -> pre-preparo -> intermediario -> produto pronto -> prato -> porcao -> marmita -> combo -> embalagem/apoio`, com rastreabilidade total de custo e rendimento.
