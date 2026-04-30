# Project Roadmap

Last updated: 2026-04-17
Status: active

## Product Objective

Substituir o Excel legado por uma aplicacao web de ficha tecnica com cadastro unico de itens, composicao recursiva, calculo de custo/rendimento, rastreabilidade e operacao self-hosted.

## Milestone v1.1 - Confirmacoes com cliente

Origem: `docs/qa/2026-03-26-plano-de-confirmacao-com-cliente.md`

### Phase 1 - Cadastros mestres gerenciaveis

Status: completed

Entregar CRUD para:
- fornecedor
- tipo
- categoria operacional
- unidade
- modalidade

Com regra de exclusao apenas sem vinculos.

Resultado entregue:
- area `/cadastros` com gerenciamento de fornecedor, tipo, categoria operacional, unidade e modalidade
- persistencia com Prisma e fallback demo
- protecao de exclusao quando houver vinculos

### Phase 2 - Importacao operacional de itens

Status: completed

Entregar importacao recorrente apenas para itens, com:
- mapeamento de colunas
- validacao
- historico
- rastreabilidade da origem
- registro da ultima atualizacao

Resultado entregue:
- trilha recorrente de importacao operacional via `.csv`
- mapeamento automatico das colunas conhecidas com registro no historico tecnico
- atualizacao/criacao de itens com preservacao de execucoes e artefatos

### Phase 3 - Reestruturacao da tela de item

Status: completed

Escopo:
- cabecalho padronizado
- bloco de detalhamento operacional
- indicador visual de descricao operacional
- data e hora da ultima atualizacao

Resultado entregue:
- cabecalho padronizado
- bloco de detalhamento operacional reorganizado
- indicador visual de descricao operacional
- data e hora da ultima atualizacao na leitura do item

### Phase 4 - Reestruturacao do cabecalho da ficha tecnica

Status: completed

Escopo:
- produto
- datas de criacao e ultima alteracao
- modalidade
- grupo operacional
- rendimento com destaque
- unidade de medida
- custo atual da ficha
- `% de Coccao`
- total de peso com regra visual

Resultado entregue:
- modalidade selecionada diretamente na ficha
- datas de criacao e ultima alteracao visiveis
- grupo operacional, rendimento, unidade e custo atual no cabecalho
- `% de Coccao` e leitura de total de peso no fluxo por etapa
- indicador visual para observacao da ficha

### Phase 5 - Ficha tecnica por etapas

Status: completed

Escopo:
- multiplas etapas sequenciais
- inclusao de itens por etapa
- botoes `Adicionar Itens` e `Adicionar Etapas`
- entrada e saida por etapa
- perda calculada por etapa
- peso final por etapa
- FC por etapa
- IC por etapa
- valor total da etapa

Resultado entregue:
- modelagem, persistencia e edicao por multiplas etapas
- botoes `Adicionar Itens` e `Adicionar Etapas`
- FC, IC, entrada, saida, perda e valor total no nivel da etapa
- leitura por nivel/camada preservada na composicao

### Phase 6 - Parte inferior da ficha inspirada no Excel

Status: completed

Escopo:
- reorganizar totais e quadros inferiores da ficha
- manter referencia visual e funcional no Excel legado
- adaptar a experiencia para uso web sem copiar limitacoes da planilha

Resultado entregue:
- quadro final da ficha reorganizado em grupos de pesos, custos, venda e leitura operacional
- leitura final consolidada inspirada na area inferior do Excel, adaptada ao fluxo web

## Current Focus

Milestone v1.1 implementado e homologado localmente. Em 2026-04-01 o cliente abriu um novo ciclo via `especificacao-sis-restaurante.pdf` e refinou o Quadro Final com `implementacao-ficha-v2.pdf`, consolidando bugs P1, refatoracoes de item/ficha e ajustes de UX para o proximo milestone.

## Milestone v1.2 - Alinhamento com especificacoes consolidadas

Origem: `SIS-Restaurante-Especificacoes-v1.pdf` (documento consolidado 07/04/2026, 24 paginas, 4 telas)
Substitui: `especificacao-sis-restaurante.pdf` + `implementacao-ficha-v2.pdf`
Research: `.planning/quick/260410-kma-alinhar-sistema-com-especificacoes-do-pd/260410-kma-RESEARCH.md`

### Phase 7 - Alinhamento completo com SIS-Restaurante-Especificacoes-v1.pdf

Status: planned

Goal:
- alinhar todas as 4 telas do sistema com as especificacoes consolidadas do PDF v1 (07/04/2026);
- corrigir 19 divergencias criticas, 23 importantes e 7 menores identificadas no research;
- garantir que grades, formularios, badges, filtros, ordenacao, formatacao e layout correspondam exatamente ao PDF.

Depends on:
- Phase 6

Requirements:
- [SPEC-GRADE-ITENS] Grade de Itens: 15 colunas na ordem correta, badges com hex colors, filtros (nome+tipo+categoria+status), ordenacao em 4 colunas, paginacao 10/pagina, fornecedor "+N", coluna Status, remocao de colunas extras
- [SPEC-GRADE-FICHAS] Grade de Fichas: 12 colunas, versao como badge inline no Produto, FC/IC com regras de cor, Preco de Venda, filtros (nome+modalidade+grupo+status), card label "FICHAS TECNICAS", data absoluta
- [SPEC-CADASTRO-ITEM] Cadastro de Item: 3 blocos (Identificacao, Compras/Fornecedor, Observacoes), Descricao opcional, Fator calculado (readonly), campos calculados em verde, validacoes de save, multiplos fornecedores com regras
- [SPEC-FICHA-TECNICA] Ficha Tecnica: Codigo + Versao no cabecalho, drag-reorder na grade, Coccao Final como bloco dedicado, Quadro Final com strip horizontal (Rendimento editavel + Unidade dropdown + FC + IC), prevencao circular no dropdown

Success criteria:
1. Grade de Itens exibe 15 colunas na ordem do PDF, com badges Tipo usando hex colors exatos, coluna Status, filtro Categoria Operacional, e ordenacao em Nome/Preco Compra/Preco Uso/Ult. Atualizacao.
2. Grade de Fichas exibe 12 colunas com versao como badge inline, FC/IC com cores verde/vermelho/cinza, coluna Preco de Venda, filtros Modalidade e Grupo, e card label "FICHAS TECNICAS".
3. Cadastro de Item tem Descricao opcional, Fator de Conversao calculado (Qtde Compra / Qtde Uso, readonly, verde), blocos na ordem correta, e campos calculados com destaque visual verde.
4. Ficha Tecnica exibe Codigo e Versao, suporta drag-reorder, tem Coccao Final como bloco dedicado, e Quadro Final com strip horizontal e Rendimento editavel sincronizado.
5. Nenhum campo exibe NaN, null, undefined ou zero quando deveria exibir "--".
6. Layout com table-layout fixed, larguras de coluna conforme PDF, row height 42px, min-width 1280px.

Plans:
- [x] 07-01: Hardening de seguranca e guardas numericas
- [x] 07-02: Contrato e persistencia operacional de item
- [x] 07-03: Grade de Itens — 15 colunas, badges, filtros, ordenacao e layout conforme PDF secao 1
- [x] 07-04: Grade de Fichas Tecnicas — 12 colunas, versao inline, FC/IC cores, filtros e layout conforme PDF secao 2
- [x] 07-05: Cadastro de Item — blocos, campos calculados, fornecedores e validacoes conforme PDF secao 3
- [x] 07-06: Ficha Tecnica — codigo, versao, drag-reorder, Coccao Final, Quadro Final conforme PDF secao 4

### Phase 8 - Recuperacao fidelidade layout e modelo fornecedor

Status: completed (7/7 plans — closed 2026-04-17. Entrega via git tag + commit SHA; ZIP removido por decisao do usuario.)

Goal:
- reconquistar confianca do cliente apos rejeicao da entrega em 2026-04-17;
- realinhar estritamente as 4 telas aprovadas com os HTMLs de referencia (Itens, Ficha Tecnica e demais);
- corrigir o modelo de dados de item para que unidade de compra/uso, quantidade de compra/uso e preco passem a viver em ItemFornecedor (nao mais no item mestre);
- fechar as pendencias pontuais da Ficha Tecnica citadas pelo cliente (item 10, FC/IC, botao de etapa final).

Depends on:
- Phase 7

Requirements:
- [SPEC-ITEM-FORNECEDOR] Cadastro de Item deve expor bloco "DETALHAMENTO DE COMPRAS / FORNECEDOR" com Fornecedor 1 principal + N fornecedores adicionais; cada fornecedor carrega unidade de compra, unidade de uso, quantidade de compra, quantidade de uso, fator de conversao (calculado), preco de compra e preco de uso (calculado da compra principal); fornecedores 2..N exibem badge "fixado do 1º fornecedor" nos campos derivados e botao "Remover".
- [SPEC-ITEM-LAYOUT] Identificacao do item deixa de carregar unidade/qtde/preco soltos; esses campos saem para dentro do bloco de fornecedor conforme HTML aprovado `tela-item-v1.html`.
- [SPEC-FICHA-FIDELIDADE] Ficha Tecnica deve espelhar estritamente o HTML aprovado, incluindo: tratativa do item 10, comportamento de FC/IC, botao de etapa final e banners de consulta de estrutura existente.
- [SPEC-4-TELAS-ESTRITO] Layout das 4 telas aprovadas deve seguir os HTMLs de referencia sem desvio visual ou de comportamento nao comunicado.

Success criteria:
1. Cadastro de Item carrega e persiste unidade/qtde/preco por fornecedor; fornecedor principal e fornecedores adicionais se comportam conforme o HTML aprovado (badges "fixado do 1º fornecedor", remocao, fator calculado em verde).
2. Migracao de dados ocorre sem perda: itens existentes tem unidade/qtde/preco movidos para o fornecedor principal ja cadastrado.
3. Ficha Tecnica mostra item 10, FC/IC e botao de etapa final conforme HTML aprovado, sem regressao nas etapas/Quadro Final entregues na Phase 7.
4. Validacao visual lado-a-lado das 4 telas contra os HTMLs aprovados passa por cliente.
5. Zero campo com NaN/null/undefined nas telas afetadas.
6. Migracoes aplicaveis via `docker compose run --rm migrate`; typecheck, testes unitarios e E2Es continuam verdes.

Pendencias de comunicacao (nao sao tarefas de build, mas devem ser resolvidas na fase discuss):
- Confirmar alinhamento dos valores com o primeiro orcamento.
- Responder sobre disposicao de investimento em ferramentas (cliente deixou em aberto 2x).
- Reestabelecer cadencia diaria de status para evitar nova surpresa na entrega.

**Plans:** 7 plans

Plans:
- [x] 08-01-nan-null-guards-PLAN.md — NaN/null guards no Quadro Final (PDFV2-CRIT-03..07), isolado, Wave 1
- [x] 08-02-schema-migracao-import-PLAN.md — Schema ItemCompra + migracao idempotente + presenter + Zod + import CSV, Wave 2
- [x] 08-03-ui-fornecedor-bloco2-PLAN.md — UI Bloco 2 fornecedor (Unidade/Qtde uso, badge fixado, derivacao client-side, toggle principal), Wave 3
- [x] 08-04-identificacao-enxuta-PLAN.md — item-form enxuto (3 blocos), grid pixel-perfect, PDFV2-ITEM-05, Wave 3
- [x] 08-05-ficha-fidelidade-banner-PLAN.md — FichaFlatGrid re-validado + banner PDFV2-FICHA-07 ingrediente em ficha semelhante, Wave 3
- [x] 08-06-grades-ajustes-PLAN.md — Grade de itens tolera "--" + badge +N; grade de fichas re-validada, Wave 4
- [x] 08-07-pixel-perfect-verification-release-PLAN.md — VERIFICATION checklists + pixel-perfect Playwright spec + 4 screenshots + release notes (ZIP removido por decisao do usuario 2026-04-17), Wave 5

### Phase 8.1 - Realinhamento pixel-perfect grades (INSERTED)

Status: planned

Goal:
- fechar o gap pixel-perfect descoberto pelo sweep Playwright do plano 08-07 sem adicionar feature;
- realinhar 10 larguras da Grade de Fichas e 2 larguras da Grade de Itens aos HTMLs aprovados.

Depends on:
- Phase 8

Requirements:
- [SPEC-4-TELAS-ESTRITO] Grade de fichas (`/fichas`) e grade de itens (`/itens`) seguem estritamente as larguras hex/paddings dos HTMLs `update/tela-fichas-grade-v1.html` e `update/tela-itens-grade-v2.html`.

Success criteria:
1. Grade de fichas: 12/12 colunas dentro da tolerancia (+/- 4px) contra HTML; deltas atuais (+12 a +70) zerados — Produto 170, Modalidade 100, Grupo Op. 100, Componentes 82, FC 60, IC 60, Custo 82, Data 110, Status 64, Obs 38.
2. Grade de itens: colunas Nome e Obs alinhadas ao HTML (deltas atuais +98 e +10 zerados).
3. `tests/e2e/pixel-perfect-phase8.spec.ts` reporta 39/39 PASS (hoje 26 PASS / 13 FAIL).
4. Typecheck + unit (159/159) + integration (21/21) permanecem verdes. Nenhuma regressao no subset E2E estavel (bootstrap + navigation + pixel-perfect-phase8, workers=1).

Origem:
- Pre-existente ao Phase 8 — grid renderizado pelo Plan 07-04; escopo estreito do 08-06 (fallback `--` + badge +N) nao incluia ajuste de largura. Gap surfado somente pelo sweep Playwright do 08-07.
- Risco direto ao objetivo raiz da Phase 8 (recuperacao de confianca apos rejeicao 2026-04-17 por drift visual).

Escopo estrito (anti-feature-creep):
- Apenas tokens/classes CSS e strings de grid-template-columns.
- Sem logica de negocio, sem mudanca de dados, sem nova coluna.

**Plans:**
- [ ] 8.1-01-fichas-grade-widths-PLAN.md — realinhar 10 larguras Grade de Fichas ao HTML, Wave 1
- [ ] 8.1-02-itens-grade-widths-PLAN.md — realinhar Nome/Obs Grade de Itens ao HTML, Wave 1
- [ ] 8.1-03-verification-release-PLAN.md — verificacao full-suite + screenshots + VERIFICATION.md, Wave 2

### Phase 9 - Telas de detalhe Item e Ficha Tecnica pixel-perfect com HTML

Status: complete (2026-04-19)

Goal:
- deixar a tela interna de cadastro/edicao de Item 1:1 com `update/tela-item-v1.html`;
- deixar a tela interna de edicao de Ficha Tecnica 1:1 com `update/tela-ficha-tecnica-v2.html`;
- alinhar estrutura de campos, blocos, ordem, comportamento e tipografia, nao apenas o shell externo;
- ajustar schema Prisma e contratos de API/Zod/presenter conforme necessario para suportar os campos/estruturas exibidos nos HTMLs de referencia.

Depends on:
- Phase 8.1

Requirements:
- [SPEC-4-TELAS-ESTRITO] Telas internas de Item (`/itens/[id]` / novo) e Ficha Tecnica (`/fichas/[id]` / nova) seguem estritamente os HTMLs de referencia `update/tela-item-v1.html` e `update/tela-ficha-tecnica-v2.html` — blocos, ordem, labels, spacing, tokens, estados vazios e comportamento.
- [SPEC-ITEM-FORNECEDOR] Bloco "Detalhamento de Compras / Fornecedor" continua alinhado ao HTML (fornecedor principal editavel + secundarios com badge "fixado do 1º fornecedor" + toggle principal + fator/preco de uso derivados). Qualquer divergencia remanescente vs HTML e fechada aqui.
- [SPEC-FICHA-FIDELIDADE] Ficha Tecnica interna (cabecalho, etapas, Coccao Final, Quadro Final, banners, badges, indicadores) bate 1:1 com o HTML v2; FC/IC, drag-reorder, strip horizontal do Quadro Final e prevencao circular preservados sem regressao.
- [SPEC-DB-API-ALINHAMENTO] Schema Prisma, contratos Zod/presenter e server actions suportam todos os campos exibidos nos HTMLs sem NaN/null/undefined; migracoes idempotentes; zero perda de dados.

Success criteria:
1. Comparacao visual lado-a-lado das duas telas contra os HTMLs de referencia passa 1:1 (layout, tokens, spacing, tipografia, estados).
2. Todos os campos presentes nos HTMLs existem no schema/API/presenter e sao persistidos/restaurados sem perda.
3. Migracoes aplicaveis via `docker compose run --rm migrate` de forma idempotente; dados existentes migrados sem perda.
4. Zero campo com NaN/null/undefined nas telas afetadas; estados vazios usam contrato aprovado ("--" ou literal orientando proxima acao).
5. Typecheck + unit + integration continuam verdes; subset E2E estavel (bootstrap + navigation + pixel-perfect) permanece 100% PASS.
6. Spec Playwright de pixel-perfect (reutilizando/estendendo `tests/e2e/pixel-perfect-phase8.spec.ts`) cobre as duas telas de detalhe e reporta PASS para todos os contratos extraidos do HTML.

Agentes esperados no plan/execute:
- Designer (UI) para fidelidade visual 1:1.
- Frontend para reimplementar os formularios/componentes React.
- Arquiteto para desenhar mudancas de schema/contrato a partir dos gaps HTML vs modelo atual.
- Backend para migrations, Prisma, server actions e Zod.

Origem:
- Continuacao natural das fases 8 e 8.1, que alinharam as telas de listagem (grades) ao HTML; esta fase cobre as telas "por dentro" (detalhe/edicao) ainda nao auditadas estritamente contra o HTML.
- Usuario explicitou 2026-04-19 necessidade de 1:1 com HTML e autorizou mudancas de banco/API.

**Plans:** 5 plans

Plans:
- [x] 09-01-schema-api-audit-PLAN.md — audit HTML<->Prisma<->Zod<->presenter + Zod preparationMode relax + declaracao zero migration (D-09..D-12), Wave 1
- [x] 09-02-item-form-retoque-PLAN.md — item-form FormSection sem description + topbar hex + placeholders Fornecedor 2+ + badge verde/cinza (D-13..D-16), Wave 2
- [x] 09-03-ficha-identificacao-refactor-PLAN.md — ficha-form Identificacao Box sx grid 110/1fr/150/175 + 1fr/1fr/120/1fr + Custo atual pixel-perfect, TDD RED/GREEN (D-01..D-04), Wave 2
- [x] 09-04-ficha-topbar-finalizacao-PLAN.md — topbar btn-icon Duplicar/Exportar + badge ativa + version badge polish + Finalizacao 2-col 50/50 opcional (D-05..D-08), Wave 3 (depende de 09-03 — ficha-form.tsx compartilhado)
- [x] 09-05-pixel-perfect-tests-release-PLAN.md — spec pixel-perfect estendido + VERIFICATION consolidada + release via git tag (sem ZIP) (D-17..D-20), Wave 4
