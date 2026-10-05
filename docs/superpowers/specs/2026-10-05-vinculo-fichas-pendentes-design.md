# Vínculo de Fichas Técnicas Pendentes

## Contexto

Uma auditoria no catálogo do restaurante Titan identificou 124 itens vendáveis (`tp_item` em `prato`/`porcao`/`marmita`/`combo`) sem nenhuma `ficha_tecnica` ativa vinculada (`cd_item_resultante`). Em quase todos os casos, já existe no sistema uma ficha técnica muito próxima por nome, mas vinculada a um item "duplicado" (normalmente a versão em lote/preparo, `tp_item = pre_preparo`), fruto de cadastros feitos em momentos diferentes com convenções de nome diferentes (ex.: `Arroz Branco` com ficha vs. `Arroz Branco 200g` sem ficha).

Esses itens "duplicados" que já têm ficha não podem simplesmente ser renomeados/movidos: eles são usados como **ingrediente** (via `ficha_componente.cd_item_componente`) dentro de outras fichas — ex.: `Arroz Branco` aparece em 59 componentes de outras receitas, `Frango Empanado` em 10. Mover ou apagar a ficha original quebraria esses cálculos de custo em cascata.

O objetivo desta feature é dar ao cliente (dono do restaurante) uma tela onde ele revisa, item por item, qual ficha existente deveria "virar" a ficha daquele item sem custo, e confirma o vínculo — sem exigir conhecimento técnico de banco de dados, e sem repetir o erro de setembro (vínculo em massa decidido por heurística sem revisão humana, que redirecionou ~900 vendas para itens errados).

## Decisão

### Localização e acesso

- Página nova e independente, fora do fluxo normal de fichas/itens: `/fichas/vincular-pendentes`.
- Sem restrição de papel — qualquer usuário autenticado do restaurante pode acessar e usar.

### Fonte de dados (lista de pendências)

- Calculada ao vivo a cada carregamento da página (sem cache/snapshot): todo item ativo com `tp_item` em `prato`/`porcao`/`marmita`/`combo` que não tem `ficha_tecnica` com `tp_status = 'ativa'` apontando para ele.
- Para cada item pendente, calcula similaridade de nome contra as `nm_exibicao` de todas as fichas ativas do restaurante, usando a mesma técnica de normalização + tokens + Jaccard já usada em `src/modules/sales/domain/sales-import.ts` (ver "Mudança incidental" abaixo).
- Mostra até 3 candidatas por item, ordenadas por score decrescente.
  - Score ≥ 0.5 → destacado como "match forte".
  - Score < 0.5 (mas acima do piso mínimo de 0.25, para não poluir com ruído) → "match fraco".
- Item sem nenhuma candidata com score ≥ 0.25 aparece na lista sem sugestão, com um link para o fluxo normal de criação de ficha do zero.

### Ação de vínculo ("clonar, não mover")

Ao escolher uma candidata e confirmar:

1. O sistema tenta extrair um peso/quantidade do nome do item pendente via regex (padrões como `200g`, `160g`, `1,2kg`, `450ml`).
2. **Se conseguir extrair um peso:**
   - Calcula o fator de escala entre esse peso e o rendimento da ficha candidata (`vl_peso_final` ou `vl_rendimento_porcoes` + unidade).
   - Recalcula proporcionalmente a quantidade de cada `ficha_componente` da candidata (`vl_qtd_bruta`, `vl_qtd_limpa`).
   - Mostra uma tela de revisão com a lista de ingredientes recalculados (quantidade antes → depois) para o cliente confirmar.
   - Ao confirmar, cria uma **nova** `ficha_tecnica` (não reaproveita a existente) com `cd_item_resultante` = item pendente, `tp_status = 'ativa'`, copiando modo de rendimento e demais metadados da candidata, com as quantidades já escaladas.
3. **Se não conseguir extrair um peso** (ex.: `Frango Empanado (Favoritos) - Mini`, sem número no nome):
   - Clona a estrutura da ficha candidata exatamente como está, sem recalcular nada.
   - Cria a nova ficha com `tp_status = 'rascunho'` (não ativa), com uma observação automática indicando que as quantidades vieram do item original e precisam de ajuste manual.
   - O cliente ajusta depois na tela normal de edição de ficha e ativa manualmente quando estiver correto.
4. Em nenhum dos dois casos a ficha ou o item candidato original são alterados ou removidos — a operação é sempre uma cópia.

### Efeito na lista de pendências

- Item que recebeu uma ficha nova com `tp_status = 'ativa'` sai da lista (já que a consulta de pendências é sempre recalculada ao vivo).
- Item que recebeu uma ficha `rascunho` continua aparecendo na lista (ele ainda não tem ficha *ativa*), mas com um indicador diferente ("rascunho criado, revisar") em vez do estado "sem vínculo nenhum".

## Mudança incidental (reuso de código)

As funções `normalizeForMatch`, `tokens` e `jaccard` hoje vivem em `src/modules/sales/domain/sales-import.ts` e são usadas apenas pelo módulo `sales`. Esta feature precisa do mesmo algoritmo no módulo `engineering`. Em vez de duplicar a lógica (o que o CLAUDE.md já pede para evitar) ou fazer `engineering` importar de `sales` (inversão de dependência estranha para a arquitetura modular), essas três funções serão extraídas para um local neutro compartilhado — `src/modules/platform/domain/text-matching.ts` — e `sales-import.ts` passa a importar de lá. Nenhuma mudança de comportamento, só realocação.

## Fora de escopo (explicitamente não incluído)

- Qualquer forma de "mesclar" os dois itens duplicados em um só (rebatizar, mover vendas, apagar o duplicado). Ficou definido na conversa de design que isso é um projeto de limpeza de catálogo separado e mais arriscado (exigiria revalidar toda receita que usa o item em lote como ingrediente).
- Edição de ingredientes dentro da própria tela de vínculo além da tela de revisão da proporção calculada — ajustes finos continuam na tela normal de edição de ficha.
- Qualquer gate de permissão além de estar autenticado.
- Qualquer alteração em como `Retorno Financeiro` ou `Matriz Giro x Margem` tratam `hasCostData` — item com ficha `rascunho` continua sem custo computado para fins de relatório, igual a hoje.

## Resultado Esperado

- Em `/fichas/vincular-pendentes`, o usuário vê a lista completa e atualizada de itens vendáveis sem ficha ativa, cada um com até 3 sugestões de ficha existente ranqueadas por semelhança de nome, ou um link para criar do zero quando não há sugestão.
- Ao escolher e confirmar uma candidata, uma ficha nova é criada para o item pendente — escalada automaticamente quando o peso do item é identificável no nome (com revisão antes de salvar), ou clonada como rascunho quando não é.
- A ficha e o item candidato original nunca são alterados.

## Validação

- Teste unitário da extração de peso/quantidade do nome do item (casos com e sem número, formatos `Ng`, `N,Nkg`, `Nml`).
- Teste unitário do cálculo de fator de escala e recalculo de `ficha_componente`.
- Teste de integração: fluxo completo de vínculo (caminho com peso extraído → ficha ativa; caminho sem peso → ficha rascunho), confirmando que o item candidato original permanece inalterado.
- Teste manual: abrir a tela, confirmar que a lista bate com a contagem de itens sem ficha ativa no banco, escolher um item de cada caminho (com e sem peso no nome) e verificar o resultado.
