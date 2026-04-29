# ADR 002: Runtime Self-Hosted de Produção

## Status

Aceito

## Contexto

A fase 1 precisa rodar em infraestrutura própria com o menor número de peças possível, mantendo o monólito modular em Next.js, PostgreSQL, Prisma, autenticação por sessão segura e rotinas operacionais básicas para deploy, rollback, backup e importação do Excel legado.

## Decisão

Adotar uma topologia única baseada em Docker Compose:

1. `db`: PostgreSQL 17 com volume persistente.
2. `migrate`: job one-shot usando o target `ops` do mesmo Dockerfile para aplicar `prisma migrate deploy` e, opcionalmente, seed de bootstrap.
3. `app`: Next.js standalone em container não-root.
4. `proxy`: Nginx como reverse proxy HTTP para o monólito.
5. `db-backup`: sidecar simples baseado em `postgres:alpine` executando `pg_dump` periódico para volume dedicado.

Operações administrativas ficam no próprio repositório como scripts:

- criação de usuários;
- recalculo manual de custos;
- reconciliação manual de conflitos de importação;
- backup e restore do banco.

## Consequências

### Positivas

- Mantém um único artefato web e respeita o monólito modular.
- Separa runtime enxuto (`runner`) de tarefas operacionais (`ops`).
- Permite subir produção com `docker compose up -d --build` e healthchecks em todos os serviços principais.
- Deixa backup e restauração documentados sem introduzir orquestração externa.

### Negativas

- TLS automático não faz parte da fase 1; o Nginx entra como base HTTP e pode ficar atrás de um terminador TLS externo.
- O sidecar de backup é básico e não substitui retenção externa/off-site.
- A reconciliação manual de conflitos fica operacionalizada por fila na UI e script CLI, não por workflow rico de aprovação em tela.

## Fase 2 já preparada

- Substituir Nginx por edge com TLS/certificados gerenciados.
- Externalizar storage de backups.
- Agendar jobs com scheduler externo.
- Evoluir a fila de reconciliação para workflow transacional dentro da UI.
