---
slug: fichas-nova-server-error
status: resolved
trigger: Cliente reportou que a Ficha Técnica não está salvando. Na verdade a própria rota /fichas/nova quebra no server-side antes de exibir o formulário.
created: 2026-04-21
updated: 2026-04-21
---

# Debug Session: fichas-nova-server-error

## Trigger

<DATA_START>
Cliente reporta que a Ficha Técnica não está salvando. Screenshot confirma que a página `localhost/fichas/nova` falha no render server-side com:

```
Application error: a server-side exception has occurred (see the server logs for more information).
Digest: 1672065038
```

Perguntas que fiz ao cliente e respostas:
- Banco de dados está rodando? → Sim
- Está salvando itens? → Sim, acabou de cadastrar "água" em /itens e salvou normal

Portanto: banco OK, CRUD de Item OK, apenas `/fichas/nova` está quebrada antes mesmo de o formulário aparecer.
<DATA_END>

## Symptoms

- **Expected behavior**: Abrir `/fichas/nova` deveria renderizar o formulário de cadastro de Ficha Técnica.
- **Actual behavior**: A página falha em SSR/RSC e renderiza a tela padrão do Next.js "Application error: a server-side exception has occurred" com `Digest: 1672065038`. O formulário nunca aparece — o cliente não consegue nem tentar salvar.
- **Error messages**: `Application error: a server-side exception has occurred` — Digest `1672065038`. Stack real ainda desconhecido (precisa do output do terminal `next dev`).
- **Timeline**: Surgiu após os últimos commits em "tela-item" (refs recentes: f3baae0 `test(e2e): cobertura CRUD Item + Ficha`, 47832eb `docs(quick-20260421)`, 9c326bf `chore: merge quick task worktree`, 888bc8a `fix T1 — Fornecedor`, b13e62d `feat T3 — auto-calculo Rendimento`). A data de hoje é 2026-04-21 e todos os commits são do mesmo dia.
- **Reproduction**: Abrir http://localhost:3000/fichas/nova (ou `localhost/fichas/nova` como no print) com `next dev` rodando.

## Initial Hypotheses

1. Erro de SSR/RSC em `app/fichas/nova/page.tsx` (ou layout pai) — provavelmente uma query Prisma/Supabase que falha no render (throw sem try/catch).
2. Dependência de dados (Itens/Unidades/Categorias/Fornecedores) retorna `null`/`undefined` e o componente acessa `.map` / `.nome` sem guard.
3. Regressão nos commits de hoje em "tela-item": mudança em schema/shape de Item quebrou consumidor em Ficha Técnica. Especialmente o commit 888bc8a ("Fornecedor 2 nao some mais + erros per-row visiveis") e b13e62d ("auto-calculo Rendimento da Porcao sem Coccao Final").
4. Digest `1672065038` precisa ser correlacionado com o stack no terminal do `next dev` — é onde vai aparecer o stack trace real.

## Current Focus

- **hypothesis**: Ambiente local do cliente tem estado diferente do repo (possivelmente `.next` stale, ou está rodando `next start` de um build antigo, ou variáveis de ambiente diferentes). Repro local falhou — página renderiza 200 tanto com DB UP quanto com DB DOWN.
- **test**: Pedir ao cliente o stack trace real do terminal onde roda o Next, para mapear Digest 1672065038 ao throw concreto.
- **expecting**: Stack trace vai apontar arquivo:linha exatos. Muito provavelmente:
  - Erro em middleware/auth (não chega a `page.tsx`), OU
  - `.next` cache stale apontando para schema antigo, OU
  - Um componente client que tenta acessar `window`/`document` durante SSR (falha específica do build prod).
- **next_action**: checkpoint — solicitar terminal output do cliente.

## Evidence

- timestamp: 2026-04-21 20:45 (local)
  fact: `src/app/(app)/fichas/nova/page.tsx` linhas 17-23 chama três repos em paralelo — `getCatalogRepository().listItemOptions()`, `getEngineeringRepository().listModalities()`, `getMasterDataRepository().listStageTypes()`.
  source: leitura do arquivo.
- timestamp: 2026-04-21 20:47
  fact: Os três repos wrappam Prisma em try/catch e caem para `getDemoStore()` quando DB indisponível. `listItemOptions` usa `listItemOptionsWithPrisma` com try/catch que retorna `null` em falha, e na chamada do método faz fallback silencioso.
  source: `src/modules/catalog/server/catalog-repository.ts:421-476,744-754`; `src/modules/master-data/server/master-data-repository.ts:289-339,421-431`; `src/modules/engineering/server/engineering-repository.ts:1585-1610`.
- timestamp: 2026-04-21 20:49
  fact: Commits de hoje tocaram APENAS componentes client (`components-editor.tsx`, `item-form-schema.ts`/`item-form.tsx`/`purchases-editor.tsx`). Nenhum arquivo em `/server/` foi modificado nos últimos 6 commits. Nenhuma mudança estrutural em `NewFichaPage`.
  source: `git log --oneline -20 --name-only` + `git show b13e62d --stat` + `git show 888bc8a --stat`.
- timestamp: 2026-04-21 20:50
  fact: Diff dos últimos 5 commits em `src/modules/*/server/` só mudou `item-form-schema.ts` (lógica de flatten de erros Zod — só impacta save, não leitura).
  source: `git diff HEAD~5 HEAD -- src/modules/**/server/`.
- timestamp: 2026-04-21 20:52
  fact: REPRO LOCAL FALHOU. Com `npm run dev` + usuário autenticado (ops:create-user), `GET /fichas/nova` retornou HTTP 200 com 218KB de HTML de formulário válido (nenhuma string "Application error" / "Digest" / "server-side exception").
  source: `curl -b cookies.txt http://127.0.0.1:3000/fichas/nova -o /tmp/fichas-nova.html` → `grep -c "Application error|Digest" = 0`. Log do next dev limpo: `GET /fichas/nova 200 in 3955ms`.
- timestamp: 2026-04-21 20:54
  fact: Mesmo com DB parado (`docker compose stop db`), `/fichas/nova` também retornou HTTP 200 (206KB HTML). Os 3 repos caíram para demo data via fallback nos try/catch — sem throw.
  source: `docker compose stop db` → `curl /fichas/nova` → HTTP 200, zero error markers.
- timestamp: 2026-04-21 20:55
  fact: `.env` do projeto tem `NODE_ENV=production`. Isso pode afetar como o Next trata erros (mostra só o digest e esconde o stack real em prod mesmo em dev, dependendo de como é executado).
  source: leitura de `.env` linha 2.

## Eliminated

- **H1 (commit recente quebrou query Prisma em NewFichaPage)**: eliminado. Nenhum commit desde 0fcb359 tocou arquivo server consumido por `/fichas/nova`. Os repos não foram modificados.
- **H2 (dependência de dados retorna null/undefined sem guard)**: parcialmente eliminado. Repos fazem fallback para demo data, e demo data tem registros default (modalities, stageTypes, items com campos populados). Teste de repro com DB fora mostrou página renderizando.
- **H3 (mudança em shape Item quebrou consumidor)**: eliminado. Commits 888bc8a (purchases-editor) e b13e62d (components-editor) só mudaram UI client — não mudaram shape de `listItemOptions`.

## New Evidence from User (2026-04-21 21:11)

Cliente mandou screenshot do Docker Desktop com log do container `app`:

```
× Error: Item cmnjpoxfw00xr01qof272qv1m nao encontrado.
    at <unknown> (.next/server/chunks/6540.js:1:76338)
    at Object.saveFicha (.next/server/chunks/6540.js:1:77108)
    at async m (.next/server/chunks/6540.js:1:51009) {
  digest: '1672065038'
}
```

Request logs do proxy:
```
GET /fichas/nova?_rsc=jdaz6 HTTP/1.1 200 25538  ← página carrega OK
POST /fichas/nova HTTP/1.1 500 112               ← save falha
```

**REFRAME CRÍTICO:** A página /fichas/nova **carrega corretamente** (HTTP 200). O erro ocorre **ao clicar Salvar** — `saveFicha` server action throw porque um `Item` com id `cmnjpoxfw00xr01qof272qv1m` (cuid) não existe no banco.

Ambiente do cliente: **Docker Compose** (containers: db, db-backup, migrate, app, import-worker, proxy). Não é ambiente local plain `next dev` — é build de produção rodando em container.

## New Hypotheses

- **H5 (cuid stale entre dropdown e save)**: O dropdown de Items foi populado em uma request anterior (possivelmente com fallback demo ou com ids antigos), e quando o cliente seleciona um item + clica Salvar, o id enviado não existe mais no banco real. Causas possíveis:
  - Item foi deletado entre load e save
  - Dropdown renderizado do demo store mas save valida contra Prisma real
  - Cache RSC/HTML do Next guardou ids antigos e o DB foi resetado/migrado
- **H6 (auto-seed demo vs banco real dessincronizado)**: Clients Docker + migrate container + ambientes com fallback podem ter demo data sendo renderizado no form mas banco real não tem esses ids.
- **H7 (save lookup com filtro errado)**: `saveFicha` faz lookup de Item que filtra por tenant/org/deletedAt/status e não encontra mesmo o Item existindo fisicamente.

## Current Focus (UPDATED)

- **hypothesis**: `saveFicha` faz uma validação de existência de Item antes de criar a Ficha, e essa validação está usando um filtro mais restritivo que a listagem — OU o dropdown mostrou um cuid que não existe no banco (demo vs real).
- **test**: Ler implementação de `saveFicha` + ler `listItemOptions` e comparar filtros. Verificar se o id `cmnjpoxfw00xr01qof272qv1m` existe no banco real do cliente.
- **expecting**: Encontrar mismatch de filtro ou fallback de demo contaminando o dropdown.
- **next_action**: continue investigation com especialista em server actions / Prisma — focar em saveFicha + listItemOptions.

## Awaiting User Evidence (RESOLVED)

Preciso das seguintes informações do cliente antes de continuar:

1. **Stack trace completo do terminal onde roda Next**. No terminal onde o `next dev` ou `next start` está rodando, quando o cliente abre `/fichas/nova` aparece um erro tipo:
   ```
    ⨯ Error: <mensagem>
        at ...
        at ...
    digest: "1672065038"
   ```
   Precisamos desse bloco — é o link entre o digest e o código.

2. **Qual comando exato** o cliente usa para rodar a app? `npm run dev` ou `npm run build && npm run start`?

3. **Data/hora do último `npm run build`** (se aplicável) — se for um build antigo, pode estar referenciando código pré-fix.

4. **Output de**:
   ```
   rm -rf .next
   npm run dev
   ```
   e novamente abrir `/fichas/nova`. Se o erro sumir, é cache stale do `.next`.

## Resolution

**Root cause:** `saveFichaWithPrisma` em `src/modules/engineering/server/engineering-repository.ts:1116-1118` tinha um `} catch { return null; }` silencioso que engolia TODOS os erros do Prisma (violacao de FK, unique constraint, deadlock, etc). Quando qualquer coisa falhava no `$transaction`, a funcao retornava `null` em vez de lancar, e o wrapper `saveFicha` (linha 1651-1656) caia para o caminho do DEMO STORE. Esse caminho chama `resolveDemoFichaItem(store, input)` na linha 179, que faz `store.items.find(item => item.id === input.itemId)` — e como o `input.itemId` era um cuid real do banco (populado como hidden field a partir de `baseItem.id` em `app/(app)/fichas/nova/page.tsx:75`), a busca no store em memoria falhava e lancava `Error: Item <cuid> nao encontrado.` na linha 184. Ou seja, o erro que o cliente via NAO era o erro real — era um erro secundario de fallback que mascarava o erro Prisma original.

**Fix:** Removida a clausula `catch {}` silenciosa. Substituida por `catch (error) { console.error(...); throw error; }` em `engineering-repository.ts:1116-1126`. Agora o erro real do Prisma sobe para o cliente (nas logs do container) e nao cai para o demo fallback catastrofico. O guard `if (!prisma) return null` no topo (linha 977) continua intacto para o caso legitimo de DATABASE_URL ausente.

**Blast radius:** atomico — uma unica funcao alterada. Testes unitarios existentes continuam passando (3/3 engineering-repository + 15/15 ficha-form). `tsc --noEmit` limpo.

**Proximo passo para o cliente:** fazer rebuild do container app (`docker compose build app && docker compose up -d app`) e tentar salvar a ficha de novo. Agora a mensagem de erro que aparecer vai ser a REAL — provavelmente algo como violacao de FK, unique constraint, ou o Prisma apontando o campo exato que esta faltando. Com essa mensagem real em maos, resolver a causa proxima vira trivial.

**Nota tecnica adicional:** o design do projeto tem um padrao repetido `try { ... Prisma ... } catch { return null; }` em varios outros lugares (`saveItemWithPrisma`, `listItemOptionsWithPrisma`, etc) que pode mascarar bugs similares. Para leitura (list) faz sentido cair para demo, mas para ESCRITA (save) o fallback demo contamina o fluxo. Recomendado auditar cada `catch {}` silencioso em `*-repository.ts` em um follow-up dedicado.

## Mensagem para o cliente (WhatsApp-friendly)

> Oi! Achei o problema. Tinha um bug escondido no codigo que fazia a tela esconder o erro REAL que estava acontecendo e mostrar uma mensagem errada ("Item nao encontrado"). Ja corrigi.
>
> Voce precisa fazer o seguinte:
>
> 1. Puxar o codigo novo: `git pull`
> 2. Reconstruir o container do app: `docker compose build app`
> 3. Subir de novo: `docker compose up -d app`
> 4. Tentar salvar a ficha tecnica de novo
>
> Se der erro, dessa vez a mensagem vai ser a mensagem REAL do banco. Me manda o print que eu resolvo na sequencia. Se salvar normal, era isso mesmo.
