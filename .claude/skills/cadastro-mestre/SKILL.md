---
name: cadastro-mestre
description: Add a new "cadastro mestre" (master-data lookup entity) with list/create/update/delete, usage-count badges and inactivate-when-in-use confirmation, following the /cadastros/[kind] + master-data-repository.ts pattern. Use when the user asks for a new simple lookup/registry table (fornecedor, unidade, categoria-like entities).
---

# Cadastro mestre (lookup/registry entity)

Para entidades simples de cadastro (nome + código opcional + ativo/inativo,
tipo fornecedor/unidade/categoria/modalidade/tipo-item/tipo-etapa), este repo
já tem uma tela genérica e um repositório com o mesmo molde repetido 6 vezes.
Prefira estender esse padrão em vez de criar uma tela nova do zero.

## Onde mexer

1. **`src/modules/master-data/server/master-data-repository.ts`** — para
   cada entidade existe um par `list<Entidade>WithPrisma()` /
   `list<Entidade>FromDemo()` e `save<Entidade>` / `delete<Entidade>`.
   - `list*WithPrisma` sempre: chama `ensureMasterDataRegistry(tx)` primeiro
     (ver abaixo), busca as linhas via Prisma **sem** filtrar `sn_ativo`
     (registros inativos precisam continuar visíveis, senão "somem" da
     tela sem forma de reverter), e calcula `inUseCount` com um
     `groupBy`/`count` contra a tabela que referencia essa entidade.
   - `save*`: `update` se `input.id` existir, senão `create`. Deixe erros
     do Prisma propagarem (não engula em `catch` silencioso caindo pro
     demo store — isso mascarava falhas reais de conexão e já causou bugs
     de "salvar não funciona").
   - `delete*`: conte vínculos reais antes de excluir; se houver, retorne
     `{ success: false, reason: "..." }` em vez de excluir.

2. **`ensureMasterDataRegistry`** (mesmo arquivo): semeia valores padrão
   **apenas quando a tabela está totalmente vazia** (`count === 0`). Nunca
   faça upsert incondicional por linha aqui — isso recria automaticamente
   qualquer registro que o usuário tenha excluído de propósito no próximo
   carregamento da tela (bug real já corrigido nesse arquivo).

3. **`src/app/(app)/cadastros/[kind]/page.tsx`** — adicione uma entrada em
   `KIND_MAPPING` (título, `dbKind`, descrição, `codeMode`, `usageLabel`) e
   ligue as 4 chamadas do repositório no bloco `if (p.kind === "...")`. O
   layout (tabela em grid CSS, badge de uso, chip Ativo/Inativo, confirmação
   ao inativar via `UpdateRowForm`) já é genérico — não devería precisar
   tocar em JSX pra uma entidade nova que só tem nome+código+ativo.

4. **`src/app/(app)/cadastros/page.tsx`** — adicione o card no array `MENUS`
   (título, descrição, ícone, cor) e a entrada correspondente em
   `countsByHref`.

5. **`src/modules/master-data/server/master-data-actions.ts`** — adicione o
   `case "<kind>":` em `saveMasterDataAction`/`deleteMasterDataAction`
   chamando o `save<Entidade>`/`delete<Entidade>` novo.

6. Rode `npm run typecheck` e teste manualmente (ou peça pro usuário testar)
   criar/ativar-desativar/excluir antes de considerar pronto.
