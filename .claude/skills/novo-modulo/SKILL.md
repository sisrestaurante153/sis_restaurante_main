---
name: novo-modulo
description: Scaffold a new domain module under src/modules/<name> following this repo's ui/server/domain shape, with a getXRepository(restaurantId) factory that tries Prisma first and falls back to the demo store. Use when the user asks to add a new domain/feature module (e.g. "cria um módulo de X").
---

# Novo módulo

Cria um novo módulo de domínio em `src/modules/<nome>/` seguindo exatamente o
molde já usado por `menu/` e `sales/` (os módulos mais recentes e mais
consistentes com a convenção atual — prefira eles como referência a módulos
mais antigos como `catalog/`, que acumularam exceções históricas).

## Passos

1. **Confirme o escopo com o usuário** antes de criar arquivos: qual entidade
   principal, quais campos, se precisa de tabela nova no Prisma schema ou se
   reaproveita uma existente.

2. **Estrutura de pastas** (sem `infra/` — não é convenção real neste repo,
   só `platform/` tem):
   ```
   src/modules/<nome>/
   ├── domain/types.ts       # interfaces exportadas nomeadas (sem default export)
   ├── server/<nome>-repository.ts
   ├── server/<nome>-actions.ts
   └── ui/<algo>-view.tsx (e outros componentes conforme necessário)
   ```

3. **Repository** (`server/<nome>-repository.ts`): exporte
   `export function get<Nome>Repository(restaurantId: string) { return { ...métodos async... } }`.
   Cada método tenta o Prisma primeiro; se `getPrismaClient(env.DATABASE_URL)`
   for `null` (sem `DATABASE_URL` configurada), cai para o demo store em
   `src/modules/platform/server/demo-data.ts`. Ao adicionar uma entidade nova
   ao demo store, estenda `DemoStore` e `createInitialDemoStore()` nesse
   arquivo com arrays vazios — veja como `cardapios`/`vendas` foram
   adicionados lá como referência.

4. **Actions** (`server/<nome>-actions.ts`): `"use server"` no topo. Server
   actions chamadas por `<form action={...}>` devem redirecionar no final
   (`redirect(...)`) em vez de retornar valor, salvo quando chamadas via
   `useActionState` client-side (aí retornam um objeto de estado).

5. **Schema Prisma** (se precisar de tabela nova): adicione o model em
   `prisma/schema.prisma` seguindo os prefixos de coluna obrigatórios
   (`cd_`, `nm_`, `ds_`, `tp_`, `vl_`, `sn_`, `nr_`, `ts_`, `js_` — ver
   CLAUDE.md). Rode `npx prisma generate` (não conecta no banco, só gera o
   client) e escreva a migration SQL manualmente em
   `prisma/migrations/<timestamp>_<nome>/migration.sql` usando o padrão
   idempotente já usado no repo (`CREATE TABLE IF NOT EXISTS`, blocos
   `DO $$ ... END $$` pra constraints). **Nunca rode `prisma migrate dev`
   direto contra produção sem confirmar com o usuário antes.**

6. **Rotas** em `src/app/(app)/<rota>/`: `page.tsx` busca dados via
   `getXRepository(session.restaurantId)` (sessão via `requireSession()` de
   `@/modules/access/server/session-cookie`) e passa pra um componente de UI.

7. **Permissões**: se a nova área precisa de controle de acesso próprio,
   adicione o(s) código(s) de permissão em
   `src/modules/access/domain/access-control.ts` (`PermissionCode`,
   `rolePermissions`, `protectedRoutePolicies`) — veja como `menu.read`/
   `menu.write`/`sales.read`/`sales.write` foram adicionados lá.

8. **Nav**: adicione a entrada em `src/components/layout/navigation.ts`
   (dentro de `getNavigationSections`).

9. Rode `npm run typecheck` e os testes relevantes antes de considerar
   pronto. Não faça commit a menos que o usuário peça.
