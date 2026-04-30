# Phase 7: Correcao operacional do PDF v2 - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Sources:** PRD-style extraction from `especificacao-sis-restaurante.pdf` plus Quadro Final refinements from `implementacao-ficha-v2.pdf`

<domain>
## Phase Boundary

Esta fase cobre todos os itens em escopo dos dois PDFs do ciclo v1.2:

- bugs P1 de ficha, fornecedor, sessao e guardas numericas do Quadro Final;
- ampliacao da grade e do detalhe de item;
- nome livre da ficha, novo cabecalho, nova grade de fichas e remocao de cards/campos antigos;
- tipos de etapa, fluxo hibrido linha-a-linha e secao Montagem e Descartaveis;
- reformulacao do Quadro Final com novo contrato de `Custos e CMV`, `Venda e Margem`, `Leitura Operacional`, simulador em tempo real e badge de saude do CMV.

Esta fase nao cobre:

- configuracao dos thresholds do badge de CMV por estabelecimento;
- exportacao PDF da ficha para cozinha.
</domain>

<decisions>
## Implementation Decisions

### Locked Decisions - Bugs criticos

- `Produto` da ficha deve virar texto livre na UI e nao usar o autocomplete atual de itens como campo principal.
- O dropdown de fornecedor em Compras / Fornecedores precisa listar todos os fornecedores cadastrados durante a edicao.
- `Venda de referencia` nunca pode renderizar `R$ NaN`; quando faltar dado valido, a leitura deve ser `--`.
- `CMV total` deve exibir `Calcular peso` quando `Peso Final` estiver ausente, zero ou invalido.
- `Margem de contribuicao` e `CMV da marmita` nao podem ficar em branco por cascata de calculo invalida; devem usar `--` ou `Informe o valor` de forma coerente.
- `SESSION_SECRET` nao pode ter fallback hardcoded no runtime.

### Locked Decisions - Item

- A tela de item deve expor `Codigo`, `Qtde de Uso` e `Preco de Uso`.
- `Qtde de Uso = Qtde Compra / Fator` e `Preco de Uso = Preco Compra / Fator`.
- `Unidade de Compra` precisa ficar sincronizada entre cabecalho/detalhamento e Compras / Fornecedores.
- O detalhamento de compras deve usar a largura principal da tela; os cards laterais de rastreabilidade/custos saem da UX.
- Exclusao definitiva de item so acontece sem vinculos a fichas tecnicas.

### Locked Decisions - Ficha

- O cabecalho da ficha deve exibir `Peso Final`, `Fator de Correcao` e `Indice de Coccao` nessa ordem, com formatacao percentual e nomes corrigidos.
- `Rendimento` vira o campo principal com unidade livre escolhida do cadastro.
- Os campos `Mod. Rendimento`, `% de Coccao` e `Peso final (g)` saem da UX visivel; a regra continua no backend.
- A grade de fichas precisa ter codigo, produto, versao, modalidade, grupo operacional, componentes, FC, IC, custo total, ultima atualizacao e icone de observacao.
- O fluxo de ingredientes deve seguir a Opcao C do PDF: linha por linha, etapa opcional, `Qtde Final` condicional e calculo automatico por tipo de etapa.
- `Montagem e Descartaveis` e secao opcional com impacto condicionado no `CMV com Embalagem`.

### Locked Decisions - Quadro Final

- Para tudo que envolver Quadro Final, `implementacao-ficha-v2.pdf` prevalece sobre a redacao anterior quando houver conflito.
- O bloco `Custos e CMV` deve conter exatamente cinco linhas: `Custo total da ficha`, `CMV sem embalagem`, `Custo de embalagens e descartaveis`, `CMV com embalagem`, `CMV final aplicado`.
- O toggle de montagem fica no cabecalho do card; desligado, as linhas 3 e 4 ficam bloqueadas e esmaecidas; ligado, o rotulo final muda para `CMV final aplicado (c/ emb.)`.
- O bloco `Venda e Margem` deve expor `Preco de venda`, `% de despesa variavel`, `CMV do kg (%PV)`, `Despesa variavel aplicada`, `Margem de contribuicao R$`, `Margem de contribuicao %`, barra visual de margem e badge de saude do CMV.
- O Quadro Final funciona como simulador em tempo real com recalculo `oninput`, sem autosave.
- O badge de saude do CMV usa thresholds fixos neste ciclo: `Saudavel <= 30%`, `Atencao 31%-40%`, `Critico > 40%`.
- A `Leitura Operacional` mostra `Preco de Referencia`, `Custo Real da Ficha`, `Despesa Variavel`, `Margem de Contribuicao` e `Diagnostico automatico`, respeitando as formulas do PDF.

### Locked Decisions - Reconciliacao com AGENTS.md

- O repositorio exige `item` mestre como ancora canonica. Portanto, `Produto` livre da ficha sera tratado como nome de exibicao/versionamento da ficha, enquanto o backend preserva ou cria o `item` canonico necessario para custo, dependencia e rastreabilidade.
- Nenhuma solucao pode quebrar composicao recursiva ilimitada, tabela unica de `item`, Prisma/PostgreSQL, sessao segura ou deploy self-hosted.

### The agent's discretion

- Definir a melhor forma de introduzir o nome livre da ficha (`nome_exibicao`, `produto_nome` ou equivalente), desde que a relacao canonica com `item` permaneca coerente.
- Decidir se o cadastro de tipos de etapa entra como novo registro mestre dedicado ou como extensao disciplinada do modelo atual, desde que tenha CRUD/seed e vinculo explicito com FC, IC ou sem calculo.
- Escolher o texto final do `Diagnostico automatico` por faixa de margem, desde que a regra de negocio e os limiares permaneca claros e auditaveis.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Regras de produto e arquitetura
- `AGENTS.md` - stack obrigatoria, dominio canonico e restricoes do repositorio
- `docs/adr/001-modular-monolith.md` - decisao de monolito modular e centralizacao do motor de custo
- `docs/domain/er-model.md` - entidades centrais, fechamento de dependencias e invariantes relacionais

### Especificacoes anteriores que continuam valendo
- `docs/qa/2026-03-26-plano-de-confirmacao-com-cliente.md` - baseline do ciclo homologado anterior
- `docs/superpowers/specs/2026-03-17-excel-parity-layout-design.md` - baseline de layout unificado da ficha
- `docs/superpowers/specs/2026-03-20-listing-grid-alignment-design.md` - padrao compartilhado para grades
- `docs/superpowers/specs/2026-03-20-sidebar-header-removal-design.md` - remocoes visuais previamente aprovadas

### Arquivos atuais mais impactados
- `prisma/schema.prisma` - modelo atual de item/ficha/modalidade/etapa
- `src/modules/catalog/server/catalog-repository.ts` - persistencia e mapeamento de item
- `src/modules/catalog/ui/item-form.tsx` - tela atual de item
- `src/modules/catalog/ui/purchases-editor.tsx` - compras/fornecedores atual
- `src/modules/catalog/ui/items-listing-view.tsx` - grade atual de itens
- `src/modules/engineering/server/engineering-repository.ts` - persistencia, presenter e formulas comerciais da ficha
- `src/modules/engineering/server/ficha-form-schema.ts` - contrato atual da ficha
- `src/modules/engineering/ui/ficha-form.tsx` - cabecalho e formulario atual da ficha
- `src/modules/engineering/ui/components-editor.tsx` - editor atual por etapas
- `src/modules/engineering/ui/TotaisIndicadores.tsx` - Quadro Final atual
- `src/modules/engineering/ui/fichas-listing-view.tsx` - grade atual de fichas

### Fontes principais desta fase
- `especificacao-sis-restaurante.pdf` - escopo canonico aberto no ciclo v2
- `implementacao-ficha-v2.pdf` - refinamento mais recente do Quadro Final; prevalece em caso de conflito sobre nomenclatura, formulas e UX do resumo final
</canonical_refs>

<specifics>
## Specific Ideas

- Priorizar os bugs P1 e as guardas numericas antes de mexer na estrutura completa da ficha.
- Separar o trabalho em ondas que minimizem conflito de arquivos: seguranca/guardas, item, ficha/listagens, fluxo hibrido e por fim Quadro Final.
- Cobrir cada frente com testes unitarios e ao menos um fluxo E2E regressivo para item + ficha.
</specifics>

<deferred>
## Deferred Ideas

- Export PDF da ficha para cozinha.
- Thresholds do badge de saude do CMV configuraveis por estabelecimento.
</deferred>

---

*Phase: 07-correcao-pdf-v2*
*Context gathered: 2026-04-01 via `especificacao-sis-restaurante.pdf` and `implementacao-ficha-v2.pdf`*
