# Phase 8: Recuperacao fidelidade layout e modelo fornecedor - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Sources:** ROADMAP.md Phase 8, REQUIREMENTS.md (PDFV2-CRIT/ITEM/FICHA), HTMLs aprovados em `update/`, PDF `update/pendencias-sis-restaurante-v3.pdf`, quick task `20260417-pendencias-v3` (18 itens entregues), Phase 7 CONTEXT como baseline.

<domain>
## Phase Boundary

Esta fase entrega:

- refatoracao do modelo de dados de item para que **unidade de compra/uso, quantidade de compra/uso e preco** vivam em `ItemCompra` (por fornecedor), removendo-os do bloco de Identificacao do item mestre;
- fidelidade visual e comportamental estrita das 4 telas aprovadas (`tela-item-v1.html`, `tela-itens-grade-v2.html`, `tela-ficha-tecnica-v2.html`, `tela-fichas-grade-v1.html`) — pixel-perfect em larguras, cores e paddings;
- fechamento dos bugs P1 ainda Pending do ciclo v1.2 relativos a NaN/null/undefined no Quadro Final (PDFV2-CRIT-03..07);
- re-validacao lado-a-lado com HTML das entregas do quick task `20260417-pendencias-v3` (item 10 FichaFlatGrid, FC/IC coloridos, botao "Adicionar Coccao Final", drag-reorder, 18 itens);
- banner de consulta "ingrediente ja aparece em ficha semelhante" (PDFV2-FICHA-07);
- entrega ao cliente via **pacote ZIP do sistema** para homologacao async (nao demo ao vivo, nao deploy separado).

Esta fase nao cobre:

- as 3 pendencias comerciais listadas no ROADMAP (alinhamento com 1o orcamento, investimento em ferramentas, cadencia diaria) — explicitamente removidas do escopo pelo usuario ("nada disso precisa ir");
- configuracao de thresholds do badge CMV por estabelecimento (roadmap v2);
- export PDF da ficha para cozinha (roadmap v2);
- renomear `ItemCompra` para `ItemFornecedor` (refactor futuro, nao nesta fase);
- drop fisico imediato das colunas legadas `item.unidade_uso_padrao_id` e `item.unidade_estoque_id` (deprecacao de UI/API agora, drop de schema em fase posterior).

</domain>

<decisions>
## Implementation Decisions

### D-01 Schema: estender ItemCompra (nao renomear, nao criar novo)

- Adicionar em `prisma/schema.prisma` modelo `ItemCompra`:
  - `unidadeUsoId String @map("unidade_uso_id")` (nullable nos secundarios, obrigatorio no principal)
  - `quantidadeUso Decimal @db.Decimal(18, 4) @map("quantidade_uso")` (nullable nos secundarios, obrigatorio no principal)
  - relacao `unidadeUso UnidadeMedida @relation(...)` com alias (ex.: `ItemCompraUnidadeUso`) para conviver com a relacao ja existente em `unidadeCompra`.
- **Nao renomear** a tabela `item_compra` nem o modelo `ItemCompra`: blast radius grande demais para um ciclo de recuperacao de confianca. Rename fica como refactor futuro.

### D-02 Fator de conversao: sempre computado na leitura

- Nenhuma coluna `fator` em `ItemCompra`. Presenter/repository calcula `fator = quantidadeCompra / quantidadeUso` em cada leitura.
- UI exibe com `readonly` + classe `calc` verde + hint "Calculado automaticamente." (conforme HTML `tela-item-v1.html` linhas 273-277).
- Alinhado com Phase 7: `Qtde de Uso` e `Preco de Uso` ja eram derivados; `Fator` segue o mesmo padrao.

### D-03 Legado no Item: deprecacao temporaria por 1 ciclo

- `item.unidadeUsoPadraoId` e `item.unidadeEstoqueId` ficam nullable no schema, removidos da UI (Identificacao), da API de response e dos serializers nesta fase.
- Colunas permanecem fisicamente por ~1 ciclo para rollback seguro; drop fisico em uma fase posterior apos estabilizacao em producao local.
- Forms de item **nao** oferecem mais esses campos. Nenhum default automatico desses valores no save.

### D-04 Migracao de dados: SQL migration idempotente

- Criar migration Prisma com:
  - `UPDATE item_compra SET unidade_uso_id = (SELECT unidade_uso_padrao_id FROM item WHERE item.id = item_compra.item_id), quantidade_uso = 1 WHERE principal = true AND unidade_uso_id IS NULL;`
  - Para itens sem nenhum `item_compra`: nao forca criacao (item sem fornecedor permanece permitido — ver D-12).
  - Para itens com `item_compra` mas sem principal marcado: promove o primeiro por `criadoEm` a principal (seguindo padrao ja existente da Phase 7).
- Migration deve rodar via `docker compose run --rm migrate` (ambiente canonico Phase 7).
- Idempotencia: rodar duas vezes nao altera resultado.

### D-05 Regra "fixado do 1o fornecedor": derivacao em tempo de leitura

- `unidadeUsoId` e `quantidadeUso` em fornecedores com `principal = false` **sao nullable e ignorados na escrita** pela UI (payload nao envia esses campos para secundarios).
- Presenter/repository na leitura faz JOIN com o `ItemCompra` onde `principal = true` do mesmo item e injeta `unidadeUso` + `quantidadeUso` no DTO de resposta para os secundarios.
- UI renderiza esses campos com `readonly` + badge `<span class="tag-fixado">fixado do 1o fornecedor</span>` (conforme HTML linhas 325-326, 339-341).
- Vantagem: uma so fonte de verdade; trocar principal propaga automaticamente.

### D-06 Troca de fornecedor principal: recalculo automatico com aviso discreto

- Toggle/checkbox para marcar principal = true em outro fornecedor.
- Ao salvar, a UI **nao** bloqueia — os campos fixados dos secundarios re-derivam do novo principal automaticamente no presenter da proxima leitura.
- Feedback visual discreto inline: "Campos fixados atualizados a partir de <novo principal>" apos o save.
- Validacao: se a UI tentar enviar `principal = true` em mais de um fornecedor, erro de save "Somente um fornecedor pode ser principal".

### D-07 Formula Preco de uso por fornecedor

- `precoUso(fornN) = precoCompra(fornN) / fator(fornN)` — cada fornecedor usa **seus proprios** valores.
- Hint do HTML "Calculado a partir da compra principal" refere-se ao **tipo de calculo** (compra → uso), nao ao fornecedor principal.
- Rationale: permite comparacao real de preco de uso entre fornecedores; se fator(principal) fosse usado, o preco_uso do secundario seria enganoso quando a unidade de compra difere.

### D-08 Validacao de save com multiplos fornecedores

- Exatamente 1 fornecedor com `principal = true` (se houver algum fornecedor).
- Principal: `fornecedorId`, `unidadeCompraId`, `unidadeUsoId`, `quantidadeCompra`, `quantidadeUso`, `precoCompra` obrigatorios.
- Secundarios: `fornecedorId`, `unidadeCompraId`, `quantidadeCompra`, `precoCompra` obrigatorios; `unidadeUsoId` e `quantidadeUso` ignorados na escrita (derivados no read).
- Zero fornecedor permitido: item pode existir sem compra (tanto hoje na base como na UX atual).
- Unique constraint `(itemId, fornecedorId, unidadeCompraId)` ja existe — mantida.

### D-09 Bloco Identificacao do item: enxuto

- Campos do HTML `tela-item-v1.html` Bloco 1: **Codigo** (auto-gerado unico, editavel — Phase 7), **Nome**, **Descricao** (opcional — pendencias-v3 #9), **Tipo principal**, **Categoria operacional**.
- **Sai da Identificacao:** `Unidade de compra`, `Unidade de uso`, `Qtde compra`, `Qtde uso`, `Preco compra`, `Preco uso`, `Fator de conversao`. Tudo isso vai para o Bloco 2 por fornecedor.
- Planejador deve ler `tela-item-v1.html` linha a linha antes de codar para confirmar campos e ordem exatos.

### D-10 Grade de itens: dados do fornecedor principal + "+N"

- Colunas `Unidade Compra`, `Preco Compra`, `Preco Uso`, `Fornecedor` da grade puxam do `ItemCompra` onde `principal = true`.
- Se houver mais fornecedores, mostra badge `+N` ao lado do nome do fornecedor (ja implementado em pendencias-v3/07-03).
- Item sem principal: exibe `--` em todas as colunas derivadas (guardas numericas da Phase 7 cobrem).
- Ordenacao por preco continua client-side (derivados, Phase 7 D-07).

### D-11 Bloco 2 (Compras/Fornecedor): estender o que ja existe

- Base: cards de fornecedor ja entregues em pendencias-v3 (commit 592d0c8).
- Adicionar campos novos (Qtde de uso, Unidade de uso), badges `fixado do 1o fornecedor`, logica de readonly derivado, validacao de save, botao "Remover" nos secundarios, botao "Adicionar fornecedor" no fim.
- **Nao refatorar** `purchases-editor.tsx` do zero — preserva os 18 itens ja aceitos em pendencias-v3.

### D-12 Fator na UI: so dentro de cada fornecedor

- Remove o campo `Fator de Conversao` do cabecalho/Identificacao do item (se ainda existir como legado da Phase 7).
- Aparece **somente** dentro de cada card de fornecedor, readonly verde, com hint "Calculado automaticamente."

### D-13 Ficha Tecnica: re-validar lado-a-lado com HTML aprovado

- Pendencias-v3 marca item 10 (FichaFlatGrid), FC/IC coloridos e botao "Adicionar Coccao Final" como done.
- Phase 8 trata esses 3 como **entrega preliminar rejeitada**: re-valida contra `tela-ficha-tecnica-v2.html` em checklist pixel-perfect e corrige gaps se houver.
- Banners de consulta de estrutura existente: Phase 8 **entra** com PDFV2-FICHA-07 ("aviso quando ingrediente ja aparece em outra ficha semelhante") como plano dedicado. Regra: ao adicionar componente, sistema busca fichas da mesma modalidade/grupo que usam o mesmo item e exibe aviso inline com o nome da outra ficha.
- Coccao Final: planejador deve ler `tela-ficha-tecnica-v2.html` e comparar com `components-editor.tsx` para decidir se permanece como bloco dedicado (Phase 7) ou muda para etapa flag `is_final`.

### D-14 Bugs P1 do Quadro Final (PDFV2-CRIT-03..07): dentro da fase

- Integrar como plano proprio **no inicio da fase** (blast radius pequeno, desbloqueia confianca visual antes do refactor do schema).
- Cobre: `R$ NaN` nunca, `Calcular peso` em CMV total sem Peso Final, fallbacks coerentes em `Margem de contribuicao` e `CMV da marmita`, `SESSION_SECRET` sem fallback hardcoded (nota: ja resolvido em commit f01a522 per pendencias-v3 H2 — confirmar).
- Criterio de sucesso #5 da Phase 8 exige: "Zero campo com NaN/null/undefined nas telas afetadas."

### D-15 Validacao estrita das 4 telas: checklist pixel-perfect por tela

- Para cada HTML aprovado, o planejador extrai um checklist detalhado contendo:
  - todos os campos visiveis com labels exatas;
  - comportamentos observaveis (badges, readonly, hints, botoes);
  - **larguras, cores (hex exatos do CSS variables do HTML), paddings, font weights, row heights** — granularidade pixel-perfect.
- Executor marca \u2713 ou \u2717 com referencia ao componente/arquivo implementado no commit.
- `VERIFICATION.md` da fase consolida todos os checklists.
- Justificativa da granularidade alta: cliente rejeitou a entrega v1.2 por drift visual; pixel-perfect e o contrato agora.

### D-16 Regressao do pendencias-v3: E2E + checklist visual

- Rodar `npm run test:e2e -- engineering-flow` apos cada plano da fase.
- `VERIFICATION.md` inclui **checklist explicito das 18 entregas do pendencias-v3** para garantir que nada regride: badge V{n} inline, coluna Preco de Venda, coluna Obs 38px, FC/IC coloridos na grade, Codigo 60px, sortable + default A-Z, cards fornecedor, Custo Atual azul, Descricao opcional, FichaFlatGrid, drag-reorder, FC/IC no strip do Quadro Final, header limpo, badge V{n} abaixo de data, botao Coccao Final separado, labels FC/IC completos, LinearProgress 6px, Diagnostico simplificado.

### D-17 Import CSV: cria/atualiza ItemCompra principal automaticamente

- Importador continua aceitando as colunas atuais (Unidade de Compra, Qtde Compra, Preco Compra).
- Cada linha cria ou atualiza o `ItemCompra` onde `principal = true` do item, usando fornecedor informado no CSV (ou fallback `Importacao` se coluna ausente — manter compatibilidade com formato atual).
- `quantidadeUso` default = 1; `unidadeUsoId` default = `unidadeCompraId` (mesma unidade) na primeira criacao via import. Usuario ajusta depois na tela de item.
- Zero regressao operacional na trilha recorrente de importacao da Phase 2.

### D-18 Homologacao: pacote ZIP para cliente (async, nao demo)

- Entrega final da fase: gerar pacote ZIP do sistema (build producao + instrucoes) e enviar para o cliente revisar async.
- **Nao ha demo ao vivo, nao ha deploy em homologacao separado.**
- Artefato `docs/qa/2026-04-17-recuperacao-cliente.md` serve como release notes do ZIP: lista de mudancas, como rodar, 4 screenshots comparativos (app vs HTML).
- Criterio #4 ("validacao visual lado-a-lado passa por cliente") cumprido pela aprovacao async escrita do cliente apos revisar o ZIP.

### D-19 Ordem dos planos (blast radius crescente)

1. **NaN/null guards** (CRIT-03..07) — isolado, desbloqueia confianca visual.
2. **Schema + migracao** — funda cao para tudo que vem depois.
3. **UI fornecedor (Bloco 2 item)** — estende cards existentes, consome novo schema.
4. **Identificacao do item** (remocao de campos) — depende do schema migrado.
5. **Ficha fidelidade** (re-validacao item 10/FC/IC/botao + PDFV2-FICHA-07 banners) — paralelizavel com passo 3 onde possivel.
6. **Grades** (itens e fichas) — ajustes finos pos refactor.
7. **Checklists pixel-perfect + VERIFICATION + pacote ZIP** — fechamento.

### Claude's Discretion

- Estrutura exata dos campos do form de item dentro do React (composicao de `item-form.tsx` + `purchases-editor.tsx`) fica a criterio do planejador, desde que respeite D-05..D-12.
- Implementacao da busca de "ficha semelhante" para PDFV2-FICHA-07: criterio de semelhanca (mesma modalidade? mesmo grupo? ambos?) — planejador decide com base no HTML e na usabilidade, desde que o banner seja inline e nao bloqueante.
- Formato final dos screenshots comparativos do release notes (tabela lado-a-lado, carrossel, diff overlay) — discricao do executor.
- Texto do aviso "Campos fixados atualizados a partir de X" (D-06) — discricao, desde que inline e discreto.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### HTMLs aprovados (contrato de fidelidade pixel-perfect)

- `update/tela-item-v1.html` — contrato completo da tela de item: Bloco 1 Identificacao, Bloco 2 Detalhamento de Compras/Fornecedor (cards Fornecedor 1 Principal + Fornecedor N com badges fixado)
- `update/tela-ficha-tecnica-v2.html` — contrato completo da ficha tecnica: cabecalho, grid inline de componentes, Coccao Final, Quadro Final
- `update/tela-fichas-grade-v1.html` — contrato da grade de fichas: 12 colunas, badge versao inline, FC/IC com cores, filtros
- `update/tela-itens-grade-v2.html` — contrato da grade de itens: 15 colunas, badges Tipo hex, filtros, ordenacao, Fornecedor +N

### Documentos de origem da fase

- `update/pendencias-sis-restaurante-v3.pdf` — 18 itens apontados pelo cliente em 2026-04-17
- `.planning/quick/20260417-pendencias-v3/SUMMARY.md` — entrega preliminar dos 18 itens (commits abbcb63..e872872); sera re-validada nesta fase
- `.planning/quick/20260417-pendencias-v3/PLAN.md` — plano original dos 18 itens

### Regras de produto e arquitetura

- `AGENTS.md` — stack obrigatoria, dominio canonico (item mestre unico, composicao recursiva), restricoes self-hosted
- `docs/adr/001-modular-monolith.md` — decisao de monolito modular
- `docs/domain/er-model.md` — entidades centrais, invariantes relacionais
- `.planning/REQUIREMENTS.md` — PDFV2-CRIT-03..07 (guardas NaN/null), PDFV2-FICHA-07 (banner ingrediente semelhante), PDFV2-ITEM-05 (cards laterais fora)
- `.planning/ROADMAP.md` §Phase 8 — requirements, success criteria, dependencias

### Contexto da fase anterior (baseline, nao regredir)

- `.planning/phases/07-correcao-pdf-v2/07-CONTEXT.md` — decisoes trava da Phase 7 (Produto livre, Qtde/Preco de Uso derivados, Quadro Final)
- `.planning/codebase/CONCERNS.md` — status SESSION_SECRET resolvido em f01a522

### Arquivos atuais mais impactados

- `prisma/schema.prisma` §Item, §ItemCompra, §UnidadeMedida — schema a estender
- `src/modules/catalog/server/catalog-repository.ts` — persistencia de item/compras
- `src/modules/catalog/server/catalog-actions.ts` — actions de save do item
- `src/modules/catalog/ui/item-form.tsx` — tela de item (Bloco 1 Identificacao)
- `src/modules/catalog/ui/purchases-editor.tsx` — cards de fornecedor (Bloco 2) — base para estender
- `src/modules/catalog/ui/items-listing-view.tsx` — grade de itens (colunas derivadas do principal)
- `src/modules/engineering/ui/components-editor.tsx` — FichaFlatGrid inline (re-validar)
- `src/modules/engineering/ui/ficha-form.tsx` — cabecalho/form da ficha
- `src/modules/engineering/ui/TotaisIndicadores.tsx` — Quadro Final (guardas NaN)
- `src/modules/import/server/` — trilha de import (D-17)

### Testes existentes a manter verdes

- `tests/engineering-flow.*` — Playwright E2E da ficha
- `tests/importacao.*` — Playwright E2E do import
- `src/tests/` — unitarios por modulo

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `ItemCompra` (schema): ja existe com `unidadeCompraId`, `principal`, `quantidadePorEmbalagem`, `custoCompra`, `custoUnitarioBase`. Precisa so de 2 colunas novas.
- `purchases-editor.tsx`: ja renderiza cards de fornecedor (pendencias-v3 #7). Base para estender com Qtde uso / Unidade uso / badges fixado.
- `FichaFlatGrid` (pendencias-v3 #10): grid 8 colunas inline ja implementado em `components-editor.tsx` com helpers flatten/group preservando `stages[]` para backend.
- `LinearProgress` 6px (pendencias-v3 #17), badges FC/IC coloridos (pendencias-v3 #4, #12): ja disponiveis, podem ser reutilizados.
- `ItemType badges hex colors` (Phase 7 07-03): tabela de cores ja implementada, cobre a grade.
- Repositorio/action padrao com guardas `--` para valores invalidos (Phase 7 07-01): template aplicavel ao Quadro Final.

### Established Patterns

- **Presenter derivation**: Qtde/Preco/Fator de Uso ja sao derivados no presenter (Phase 7). Mesmo padrao se aplica para campos "fixado do 1o fornecedor" (D-05).
- **Server actions + Zod schema**: todo save de item passa por action com parser; estender schema para aceitar novo formato de fornecedores (D-08).
- **Dual-path repositories (Prisma / demo JSON)**: ambos os caminhos precisam da mesma logica de derivacao. Demo store pode espelhar a estrutura ou ser desabilitado temporariamente.
- **Docker Compose para migrations**: ambiente canonico Phase 7 (`docker compose run --rm migrate`). Mantido para D-04.
- **Playwright E2E engineering-flow + importacao**: tests verdes sao porta de fechamento (D-16).
- **Checklist em VERIFICATION.md**: padrao ja usado em phases anteriores; granularidade pixel-perfect e nova (D-15).

### Integration Points

- **Prisma schema \u2192 migrations**: nova migration em `prisma/migrations/YYYYMMDD_phase8_fornecedor/migration.sql` com schema change + backfill idempotente (D-04).
- **`item-form.tsx` \u2194 `purchases-editor.tsx`**: unidade/qtde/preco saem do primeiro e vao para o segundo (D-09 + D-11).
- **`catalog-repository.ts` presenter**: recebe novo campo de derivacao para secundarios (D-05).
- **`import-actions.ts` \u2192 `ItemCompra` principal**: novo code path para criar/atualizar principal (D-17).
- **Pacote ZIP**: novo script em `scripts/ops/pack-release.sh` (ou equivalente) que gera o pacote de entrega (D-18).
- **`docs/qa/2026-04-17-recuperacao-cliente.md`**: novo artefato de release notes (D-18).

</code_context>

<specifics>
## Specific Ideas

- Ordem de execucao: NaN/null primeiro porque e isolado e devolve confianca visual rapida; schema segundo porque funda todo o resto; ficha em paralelo onde possivel para aproveitar que o executor da Phase 8 ja tem contexto de `components-editor.tsx`.
- Granularidade pixel-perfect e justificada pelo historico: cliente rejeitou v1.2 por drift visual. Nao e perfeccionismo, e o contrato.
- Entregar ZIP ao cliente (nao demo) preserva cadencia do time de dev e deixa o cliente revisar no ritmo dele; release notes com screenshots comparativos compensam a ausencia de sessao ao vivo.
- Re-validacao dos 18 itens de pendencias-v3 e nao-negociavel: cada um deles fez parte da entrega que foi rejeitada, mesmo que individualmente estejam conformes hoje.

</specifics>

<deferred>
## Deferred Ideas

- Renomear `ItemCompra` para `ItemFornecedor` em schema + UI + tests — refactor futuro, blast radius grande demais nesta fase.
- Drop fisico das colunas `item.unidade_uso_padrao_id` e `item.unidade_estoque_id` — fase posterior apos estabilizacao.
- Screenshot diff automatizado (Playwright visual regression) contra os HTMLs — alto custo de setup, baseline para futuro.
- Fornecedor obrigatorio no import CSV (bloquear linha sem coluna Fornecedor) — mudanca contratual com os usuarios, avaliar em proximo ciclo de import.
- Export PDF da ficha para cozinha (PDFV2-FUT-01) — roadmap v2.
- Thresholds do badge CMV configuraveis por estabelecimento (PDFV2-FUT-02) — roadmap v2.

### Removido explicitamente do escopo pelo usuario

- As 3 pendencias comerciais do ROADMAP Phase 8 (alinhamento com 1o orcamento, investimento em ferramentas, cadencia diaria de status) — "nada disso precisa ir". Nao sao rastreadas como action item tecnico nesta fase; resolucao fora do escopo do build.

</deferred>

---

*Phase: 08-recuperacao-fidelidade-layout-e-modelo-fornecedor*
*Context gathered: 2026-04-17 via discuss-phase --all (6 areas)*
