# Arquitetura Operacional

## Visão geral

O sistema é um monólito modular web com quatro blocos operacionais:

1. `Next.js app`: interface e ações server-side.
2. `PostgreSQL`: persistência relacional do domínio, auditoria, custos e staging de importação.
3. `Nginx`: reverse proxy HTTP para exposição controlada do app.
4. `Ops scripts`: migração, seed opcional, criação de usuário, reconciliação, recalculo e backup.

## Topologia de runtime

```text
browser
  -> nginx (proxy)
    -> next.js standalone (app)
      -> postgresql (db)

docker compose extras
  -> migrate (job one-shot antes do app)
  -> db-backup (pg_dump periódico)
```

## Fronteiras

- A aplicação continua monolítica; não há serviços separados por domínio.
- O Excel legado é somente fonte de importação e conferência.
- O motor de custo, composição recursiva, dependências e snapshots continuam no backend.
- Scripts operacionais usam o mesmo schema e o mesmo código-fonte do monólito.

## Componentes principais

- `Dockerfile`
  - `runner`: imagem enxuta para servir o app.
  - `ops`: imagem com dependências de build e CLI para migração/scripts.
- `docker-compose.yml`
  - `db`, `migrate`, `app`, `proxy`, `db-backup`.
- `scripts/ops`
  - `migrate-and-seed.sh`
  - `create-user.ts`
  - `recalculate-costs.ts`
  - `reconcile-import-conflict.ts`
  - `backup-db.sh`
  - `restore-db.sh`

## Healthchecks

- `db`: `pg_isready`
- `app`: `GET /api/health`
- `proxy`: `nginx -t`
- `db-backup`: verificação do diretório de destino

## Escopo da fase 1

- Cadastro mestre de itens e fichas.
- Composição recursiva com bloqueio de ciclos.
- Cálculo e recalculo em cascata.
- Importação do legado com staging, aliases e fila de conflitos.
- Login com sessão segura.
- Deploy self-hosted básico com backup local.

## Preparado para fase 2

- TLS/certificados gerenciados na borda.
- Backup off-site e retenção expandida.
- Execução agendada por scheduler externo.
- Workflow visual completo de reconciliação manual.
- Observabilidade mais rica e métricas operacionais.
