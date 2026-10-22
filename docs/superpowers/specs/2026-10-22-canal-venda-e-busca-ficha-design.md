# Canal de Venda (cadastro) e Busca Manual de Ficha

## Contexto

O cliente pediu dois ajustes depois de observar a tela de vínculo de fichas pendentes em uso:

1. O cardápio hoje só aceita 3 canais fixos no código ("salao", "delivery", "ambos"). O cliente quer operar com canais reais e específicos de delivery (iFood, Delivery próprio, Televendas), mantendo os 3 que já existem.
2. Na tela `/fichas/vincular-pendentes`, itens sem nenhuma candidata sugerida só tinham a opção "Criar do zero". O cliente quer poder pesquisar manualmente entre todas as fichas técnicas existentes e vincular uma mesmo quando a similaridade de nome não encontrou nada.

## Decisão

### A. Cadastro mestre "Canal de Venda"

- Novo model Prisma `CanalVenda` (`canal_venda`), no mesmo molde de `CategoriaOperacional`/`Modalidade`: `cd_canal` (cuid), `ds_codigo` (único), `nm_canal` (único), `sn_ativo`, timestamps.
- Seed inicial (via `ensureMasterDataRegistry`, só quando a tabela estiver vazia): `salao`/"Salão", `delivery`/"Delivery", `ambos`/"Salão e delivery" (preserva os códigos já usados pelos cardápios existentes), `ifood`/"iFood", `delivery_proprio`/"Delivery (próprio)", `televendas`/"Televendas".
- Segue à risca o passo a passo da skill `cadastro-mestre`: entrada em `KIND_MAPPING` (`/cadastros/[kind]/page.tsx`), card em `/cadastros/page.tsx`, `list/save/delete` em `master-data-repository.ts`, cases em `master-data-actions.ts`.
- `inUseCount` do cadastro conta cardápios (`Cardapio.tp_canal`) que usam aquele `ds_codigo` - como `tp_canal` é texto livre (ver abaixo), a contagem compara por string, não por FK.

### B. Cardápio passa a usar o cadastro

- `cardapio-form.tsx`: remove `CHANNEL_OPTIONS`/`CHANNEL_LABEL` fixos no código. A lista de canais ativos (`ds_codigo` + `nm_canal`) é carregada no servidor (página que renderiza o form) e passada como prop.
- `Cardapio.tp_canal` continua sendo `String` livre no banco - nenhuma migração de dado, nenhuma FK nova. Cardápios já salvos com `salao`/`delivery`/`ambos` continuam válidos porque esses códigos são semeados no cadastro novo.
- Fora de escopo: tela de Vendas (`/vendas`) e importação de relatório de vendas não mudam.

### C. Busca manual de ficha na tela de vínculo

- Em `pending-fichas-list.tsx`: para itens com `candidates.length === 0`, troca o link "Criar do zero" por um botão "Pesquisar ficha" (remove o link antigo nesse caso - fica só a busca).
- Novo componente `SearchFichaDialog` (`src/modules/engineering/ui/SearchFichaDialog.tsx`): modal com campo de texto que filtra, no cliente, uma lista de todas as fichas técnicas ativas/rascunho do restaurante (nome + item atual) carregada ao abrir o modal; ao clicar numa ficha da lista, reaproveita o mesmo fluxo de confirmação e a mesma server action (`linkFichaToPendingItemAction`) já usados pelo `VincularFichaDialog` - reatribui a ficha escolhida pro item pendente, sem clonar, sem recalcular custo, com o mesmo aviso de "usada como ingrediente em outras receitas" quando aplicável.
- Nova query `listAllFichasForSearch(restaurantId)` em `ficha-link-repository.ts`: retorna `{ fichaId, itemName, usedAsIngredientCount }` para toda ficha com `tp_status IN ('ativa','rascunho')` do restaurante, ordenada por nome do item atual.

## Fora de escopo

- Migrar `tp_canal` (Cardapio ou Venda) para uma FK de verdade.
- Qualquer mudança na tela de Vendas ou na importação de relatório de vendas.
- Reaproveitar o campo "Canal (opcional)" do registro manual de venda - fica como está (texto livre), não é o alvo deste pedido.

## Validação

- Teste manual do cadastro: criar, ativar/inativar, excluir um canal (confirmando que excluir um canal em uso por algum cardápio é bloqueado, igual aos outros cadastros).
- Teste manual do cardápio: confirmar que cardápios já existentes com `salao`/`delivery`/`ambos` continuam abrindo e salvando normalmente; criar um cardápio novo com um dos 3 canais novos.
- Teste manual da busca de ficha: abrir o modal num item sem sugestão, buscar por nome parcial, vincular, confirmar que o item some da lista de pendentes e que a ficha/item candidato não foi alterado.
- `npm run typecheck` e `npx next lint` nos diretórios tocados antes de considerar pronto.
