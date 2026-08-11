---
name: sobe-ambiente-local
description: Bring up this repo's local dev environment from a fresh checkout (install deps, generate Prisma client, start the database, run migrations/seed, start the dev server). Use when node_modules is missing, the dev server won't start, or the user asks to "subir o ambiente"/"rodar local".
---

# Subir ambiente local do zero

Sequência real usada com sucesso neste repo (checkouts frescos às vezes não
têm `node_modules` instalado — confirme com `Test-Path node_modules` /
`ls node_modules` antes de assumir que já está pronto).

## Passos

1. **Instalar dependências** (também roda `prisma generate` via hook `prepare`):
   ```
   npm install
   ```

2. **Verificar `.env`**. Copie de `.env.example` se não existir. Confirme
   `DATABASE_URL`:
   - Postgres local via Docker Compose → siga o passo 3.
   - Supabase (pooler, porta 6543) → a URL **precisa** terminar em
     `?pgbouncer=true`, senão o Prisma falha de forma intermitente (ver
     CLAUDE.md § Environment Setup). Não precisa do passo 3 nesse caso.

3. **Banco local (só se `DATABASE_URL` apontar pra Docker)**:
   ```
   npm run db:up       # sobe Postgres via Docker Compose
   npm run db:migrate  # aplica migrations
   npm run db:seed     # dados de bootstrap (usuários admin/engenharia/consulta)
   ```

4. **Subir o app**:
   ```
   npm run dev
   ```
   Sobe na porta 3000 por padrão; se já estiver ocupada o Next tenta
   3001/3002 em sequência — confira o output pra saber a porta real antes
   de testar contra `localhost:3000` às cegas.

5. **Login de teste** (credenciais de `db:seed`):
   `admin@sis-restaurante.local` / `admin123` (demais papéis em
   CLAUDE.md § Environment Setup).

## Armadilhas já vistas neste repo

- **Processos de dev server travados em portas antigas**: se reiniciar o
  servidor sem matar o processo anterior, `npm run dev` sobe numa porta
  diferente (3001, 3002...) e testes/scripts que assumem 3000 falham
  silenciosamente contra o servidor errado. Confira com
  `netstat -ano | grep LISTENING` (ou `Get-NetTCPConnection` no
  PowerShell) e mate o processo antigo antes de subir um novo.
- **DATABASE_URL sem `pgbouncer=true`** contra o pooler do Supabase causa
  escritas que "não persistem" de forma intermitente — não é bug de
  lógica, é a connection string.
