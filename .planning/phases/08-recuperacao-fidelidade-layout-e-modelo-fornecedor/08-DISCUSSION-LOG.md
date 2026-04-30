# Phase 8: Recuperacao fidelidade layout e modelo fornecedor - Discussion Log

> **Audit trail only.** Nao usar como input para planner/research/executor.
> Decisoes estao em `08-CONTEXT.md`; este log preserva as alternativas consideradas.

**Date:** 2026-04-17
**Phase:** 08-recuperacao-fidelidade-layout-e-modelo-fornecedor
**Mode:** `/gsd-discuss-phase 8 --all` (todas as gray areas auto-selecionadas, respostas interativas)
**Areas discussed:** Schema + migracao, Regra fixado do 1o fornecedor, Identificacao do item + grade, Ficha Tecnica residual, Validacao estrita 4 telas, Import CSV + comunicacao

---

## Area 1 — Schema ItemFornecedor + migracao

### Q1 Estrategia de schema

| Option | Description | Selected |
|--------|-------------|----------|
| Estender ItemCompra | Adicionar unidade_uso_id + quantidade_uso em ItemCompra, manter nome. Migracao incremental, menos impacto. | \u2713 |
| Renomear ItemCompra \u2192 ItemFornecedor | Renomear modelo + tabela + todas as referencias. Alinha nome com cliente mas blast radius grande. | |
| Criar ItemFornecedor novo e depreciar ItemCompra | Dois modelos convivendo durante transicao. Mais seguro reversivel mas divida temporaria. | |

**User's choice:** Estender ItemCompra (Recommended)

### Q2 Fator de conversao

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre computado na leitura | Presenter calcula fator = qtde_compra/qtde_uso em cada read. Zero divergencia. | \u2713 |
| Persistir e recalcular no save | Coluna fator Decimal(18,6) salva, recalculada no save. Duplica fonte de verdade. | |

**User's choice:** Sempre computado na leitura (Recommended)

### Q3 unidadeUsoPadraoId / unidadeEstoqueId no Item

| Option | Description | Selected |
|--------|-------------|----------|
| Deprecar do Item, manter coluna temporaria | Nullable por ~1 ciclo, removida da UI/API imediatamente, drop final em fase futura. | \u2713 |
| Drop imediato | Remover colunas do schema, UI e refs em um migration atomico. Rollback mais caro. | |
| Manter como default sugerida | Coluna fica no Item como dica para fornecedor novo. Contraria o HTML aprovado. | |

**User's choice:** Deprecar do Item, remover da UI, manter coluna temporaria (Recommended)

### Q4 Migracao de dados existentes

| Option | Description | Selected |
|--------|-------------|----------|
| SQL migration idempotente | Migration Prisma UPDATE item_compra WHERE principal = true. Promove primeiro compra se principal faltar. | \u2713 |
| Script Node separado em scripts/ops/ | Migration so altera schema; backfill roda como script Node standalone pos migrate. | |
| Lazy backfill no repository de leitura | Repository detecta e promove na hora da leitura. Deixa dados legados indefinidamente. | |

**User's choice:** SQL migration idempotente (Recommended)

---

## Area 2 — Regra "fixado do 1o fornecedor"

### Q1 Campos fixados: armazenar ou derivar?

| Option | Description | Selected |
|--------|-------------|----------|
| Derivados na leitura via JOIN | unidade_uso_id e qtde_uso nullable nos secundarios. Presenter le do principal e injeta. Uma fonte de verdade. | \u2713 |
| Armazenar snapshot no save | UI copia valores do principal para secundarios no save. Drift garantido se principal mudar. | |

**User's choice:** Derivados na leitura via JOIN (Recommended)

### Q2 Trocar qual fornecedor e principal

| Option | Description | Selected |
|--------|-------------|----------|
| Recalculo automatico + aviso discreto | Ao trocar principal, secundarios re-derivam. Aviso inline "Campos fixados atualizados a partir de X". | \u2713 |
| Confirmar via modal antes de aplicar | Dialog "Trocar principal vai recalcular N secundarios. Confirmar?". Mais seguro, mais friccao. | |
| Congelar secundarios no valor atual | Secundarios mantem o que estava. Contraria a premissa "fixado do 1o fornecedor". | |

**User's choice:** Recalculo automatico + aviso discreto (Recommended)

### Q3 Formula Preco de uso em fornecedores 2+

| Option | Description | Selected |
|--------|-------------|----------|
| Preco uso(forn N) = preco_compra(forn N) / fator(forn N) | Cada fornecedor usa seus proprios valores. Permite comparacao real. | \u2713 |
| Preco uso(forn N) = preco_compra(forn N) / fator(principal) | Usa fator do principal para todos. Leitura literal do hint do HTML. | |
| Confirmar com cliente antes de decidir | Escala como pendencia de comunicacao. | |

**User's choice:** Preco uso (forn N) = preco_compra(forn N) / fator(forn N) (Recommended)

### Q4 Validacao de save com multiplos fornecedores

| Option | Description | Selected |
|--------|-------------|----------|
| Principal unico obrigatorio, secundarios validam campos proprios | Exatamente 1 principal = true. Secundarios: fornecedor + unid_compra + qtde_compra + preco obrigatorios. Zero fornecedor permitido. | \u2713 |
| Principal opcional, sistema promove 1o se faltar | Comportamento atual Phase 7. Convive mal com UX explicita do HTML. | |

**User's choice:** Principal unico obrigatorio, secundarios validam campos proprios (Recommended)

---

## Area 3 — Identificacao do item + grade de itens

### Q1 Bloco Identificacao: o que fica?

| Option | Description | Selected |
|--------|-------------|----------|
| Codigo, Nome, Descricao, Tipo, Categoria | Exatamente o que o HTML mostra. Tudo que era unidade/qtde/preco vai para Bloco 2. | \u2713 |
| Acima + grupo operacional | Se o HTML expoe grupo/subgrupo, inclui. | |
| Verificar HTML linha a linha antes de decidir | Planejador le o HTML completo antes de implementar. | |

**User's choice:** Codigo, Nome, Descricao, Tipo, Categoria (Recommended)

### Q2 Grade de itens: dados dos fornecedores N

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre do fornecedor principal + badge +N | Preco Compra / Uso / Unidade do ItemCompra principal. "+N" ao lado se houver mais. | \u2713 |
| Media ou menor preco entre fornecedores | Logica de "melhor preco". Contraria HTML aprovado. | |
| Primeira compra por data | Fallback sem principal. Criterio implicito nao pedido. | |

**User's choice:** Sempre do fornecedor principal + badge '+N' (Recommended)

### Q3 Campo Fator de conversao na UI

| Option | Description | Selected |
|--------|-------------|----------|
| Sai da Identificacao, aparece em cada fornecedor | HTML coloca Fator dentro de cada bloco fornecedor. Coerente com "unidade/qtde por fornecedor". | \u2713 |
| Duplicar no cabecalho do item | Fator no header como resumo + em cada fornecedor. Duplica info. Contraria HTML. | |

**User's choice:** Sai da Identificacao, aparece em cada fornecedor (Recommended)

### Q4 Base para o Bloco 2

| Option | Description | Selected |
|--------|-------------|----------|
| Estender o que ja existe | Cards de pendencias-v3 (592d0c8) sao a base. Adicionar Qtde/Unidade uso + badges. Preserva 18 itens. | \u2713 |
| Refactor completo do bloco 2 | Reescrever purchases-editor do zero. Arrisca regressoes. | |

**User's choice:** Estender o que ja existe (Recommended)

---

## Area 4 — Ficha Tecnica residual

### Q1 Item 10, FC/IC, botao etapa final (pendencias-v3 marca done)

| Option | Description | Selected |
|--------|-------------|----------|
| Refazer validacao lado-a-lado com HTML | Tratar pendencias-v3 como entrega preliminar rejeitada. Re-valida contra HTML em checklist pixel-perfect. | \u2713 |
| Considerar done, focar so em banners | Confia no pendencias-v3. Arrisca repetir surpresa do cliente. | |

**User's choice:** Refazer validacao lado-a-lado com HTML (Recommended)

### Q2 PDFV2-FICHA-07 (banner ingrediente ja em outra ficha)

| Option | Description | Selected |
|--------|-------------|----------|
| Dentro da fase | ROADMAP cita "banners de consulta" explicitamente. Plano dedicado. | \u2713 |
| Diferir para proxima fase | Phase 8 foca em fornecedor + fidelidade. | |
| So se HTML mostrar o banner | Conferir primeiro. | |

**User's choice:** Dentro da fase (Recommended)

### Q3 Coccao Final: bloco dedicado ou etapa is_final?

| Option | Description | Selected |
|--------|-------------|----------|
| Verificar HTML antes de decidir | Planejador le tela-ficha-tecnica-v2.html e compara com components-editor.tsx. | \u2713 |
| Manter como bloco dedicado da Phase 7 | Presume que o que existe esta certo. Arriscado. | |

**User's choice:** Verificar HTML antes de decidir (Recommended)

### Q4 Regressao das 18 entregas do pendencias-v3

| Option | Description | Selected |
|--------|-------------|----------|
| E2E engineering-flow + checklist visual | Rodar test:e2e pos cada plano. Checklist manual dos 18 itens em VERIFICATION.md. | \u2713 |
| So E2E atual | Menor overhead, maior risco visual. | |
| E2E + visual regression tests (novo) | Playwright screenshot diff. Alto custo de setup. | |

**User's choice:** E2E engineering-flow + checklist visual (Recommended)

---

## Area 5 — Validacao estrita 4 telas

### Q1 Metodologia principal

| Option | Description | Selected |
|--------|-------------|----------|
| Checklist estruturado por tela | Extrair do HTML campos/labels/comportamentos. Marcar \u2713/\u2717 com ref ao arquivo. | \u2713 |
| Screenshot diff visual (Playwright) | Render estatico vs app. Alto custo de setup. | |
| Sessao ao vivo com cliente (so) | Delega ao cliente no fim. Arrisca nova surpresa. | |
| Checklist + sessao com cliente | Checklist interno + homologacao formal. | |

**User's choice:** Checklist estruturado por tela (Recommended)

### Q2 Granularidade do checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Campos + comportamentos observaveis | Semantica visivel, sem pixel exato. | |
| Pixel-perfect (larguras, cores, paddings) | Checklist com CSS exato. Granular, preso em minucias. | \u2713 |
| So bloqueadores funcionais | So o que impede uso. Contraria pedido de layout estrito. | |

**User's choice:** Pixel-perfect (larguras, cores, paddings) — **override da recommendation**
**Notes:** Cliente rejeitou entrega por drift visual; usuario optou explicitamente por granularidade maxima para fechar o contrato de fidelidade.

### Q3 Bugs P1 da Phase 7 Pending (PDFV2-CRIT-03..07)

| Option | Description | Selected |
|--------|-------------|----------|
| Integrar como plano proprio | Zero NaN/null e criterio #5 da Phase 8. Plano dedicado no inicio. | \u2713 |
| Deixar para phase 9 | Mantem bugs P1 abertos. Contraria criterio #5. | |

**User's choice:** Integrar como plano proprio (Recommended)

### Q4 Artefato de comunicacao da fase

| Option | Description | Selected |
|--------|-------------|----------|
| docs/qa/2026-04-17-recuperacao-cliente.md | Doc dedicado: pendencias, resolucao, log de cadencia. Baseline auditavel. | \u2713 |
| Secao no SUMMARY.md no fim | Nota retroativa. Perde valor de cadencia. | |
| So notes informais fora do .planning | Deixa fora do repo. | |

**User's choice:** docs/qa/2026-04-17-recuperacao-cliente.md (Recommended)
**Notes:** Reconciliado posteriormente em Area 6 Q2: o doc sobrevive como **release notes do pacote ZIP**, sem trackear as 3 pendencias comerciais (removidas de escopo pelo usuario).

---

## Area 6 — Import CSV + comunicacao

### Q1 Import CSV durante a transicao

| Option | Description | Selected |
|--------|-------------|----------|
| Import cria/atualiza ItemCompra principal automaticamente | Continua aceitando colunas atuais; cria/atualiza principal. Zero regressao operacional. | \u2713 |
| Desabilitar import durante esta fase | Congela trilha de importacao. Arrisca bloquear operacao. | |
| Bloquear import se linha nao tem fornecedor explicito | Exige coluna Fornecedor. Cliente precisa atualizar planilhas. | |

**User's choice:** Import cria/atualiza ItemCompra principal automaticamente (Recommended)

### Q2 (retry) As 3 pendencias de comunicacao do ROADMAP

| Option | Description | Selected |
|--------|-------------|----------|
| Documentar em docs/qa/2026-04-17-recuperacao-cliente.md | Registro unico auditavel. | |
| Cadencia diaria = update curto em STATE.md | Previne surpresa final. | |
| 1o orcamento e ferramentas bloqueiam fechamento | Forca conversacao. | |
| Quick task paralelo so para comunicacao | Fora da fase de build. | |

**User's choice:** "NADA DISSO PRECISA IR" (via "Other")
**Notes:** As 3 pendencias comerciais listadas no ROADMAP (alinhamento com 1o orcamento, investimento em ferramentas, cadencia diaria) foram explicitamente removidas do escopo desta fase pelo usuario. Nao serao trackeadas como action item tecnico. Resolucao fora do escopo do build.

### Q3 Homologacao das 4 telas com o cliente

| Option | Description | Selected |
|--------|-------------|----------|
| Demo ao vivo com cliente ao fim | Sessao 30-45min screen share. Sign-off ao vivo. | |
| Video gravado enviado para cliente async | Narracao mostrando cada tela vs HTML. Mais lento. | |
| Deploy em ambiente de homologacao | Cliente testa no sistema real. Ambiente separado. | |
| **Enviar ZIP do sistema para o cliente** | Cliente recebe pacote, roda/revisa async. | \u2713 |

**User's choice:** Enviar ZIP do sistema para o cliente (via "Other")
**Notes:** "vou mandar para ele o zip do sistema". Substitui demo ao vivo e deploy separado. Release notes e screenshots comparativos entram no ZIP.

### Q4 Ordem dos planos (blast radius)

| Option | Description | Selected |
|--------|-------------|----------|
| NaN/null \u2192 Schema \u2192 UI fornecedor \u2192 Ficha \u2192 Grades \u2192 Validacao | Bugs P1 primeiro (desbloqueia confianca), depois schema (fundacao), UI, ficha paralela, grades, validacao. | \u2713 |
| Schema primeiro, tudo depois | Refactor fornecedor antes de tudo. Bugs P1 ficam soltos. | |
| Claude decide ao planejar | Deixa para /gsd-plan-phase. | |

**User's choice:** NaN/null \u2192 Schema \u2192 UI fornecedor \u2192 Ficha fidelidade \u2192 Telas grades \u2192 Validacao (Recommended)

---

## Claude's Discretion

- Composicao interna React do form de item (split entre `item-form.tsx` e `purchases-editor.tsx`).
- Criterio de "ficha semelhante" para PDFV2-FICHA-07 (mesma modalidade? grupo? ambos?).
- Formato dos screenshots comparativos no release notes (tabela, carrossel, overlay).
- Texto do aviso "Campos fixados atualizados a partir de X" (D-06).

## Deferred Ideas

- Renomear `ItemCompra` \u2192 `ItemFornecedor` (refactor futuro).
- Drop fisico das colunas legadas `item.unidade_uso_padrao_id` / `item.unidade_estoque_id` (fase posterior).
- Screenshot diff automatizado (Playwright visual regression) (futuro).
- Fornecedor obrigatorio no import CSV (mudanca contratual).
- Export PDF da ficha (PDFV2-FUT-01, roadmap v2).
- Thresholds CMV por estabelecimento (PDFV2-FUT-02, roadmap v2).

## Removidas explicitamente do escopo

- 3 pendencias comerciais do ROADMAP: alinhamento com 1o orcamento, investimento em ferramentas, cadencia diaria de status ("nada disso precisa ir").

---

*Discussion gathered: 2026-04-17 via `/gsd-discuss-phase 8 --all`*
