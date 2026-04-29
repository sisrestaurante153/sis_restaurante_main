# Troubleshooting

## `migrate` falha com erro de conexão

Sintoma:

- `DATABASE_URL nao configurada` ou timeout ao conectar no PostgreSQL.

Ações:

- confira `.env`;
- valide `DATABASE_URL_DOCKER`;
- rode `docker compose logs -f db`;
- verifique se o healthcheck do `db` ficou verde.

## App sobe em modo degradado

Sintoma:

- `/api/health` responde `degraded`;
- login ou consultas caem no fallback/demo.

Ações:

- verifique `DATABASE_URL`;
- confirme migrations aplicadas com `docker compose run --rm migrate`;
- confira se o banco contém o schema esperado.

## Proxy responde 502/504

Sintoma:

- Nginx no ar, mas a aplicação não responde.

Ações:

- veja `docker compose logs -f app`;
- valide o healthcheck do app;
- confira se `proxy` subiu depois de `app`.

## Seed não rodou

Sintoma:

- banco vazio em ambiente de homologação.

Ações:

- por padrão `RUN_DB_SEED=false`;
- execute:

```bash
docker compose run --rm -e RUN_DB_SEED=true migrate
```

## Backup não aparece no volume

Sintoma:

- `db-backup` saudável, mas nenhum `.dump`.

Ações:

- veja `docker compose logs -f db-backup`;
- confirme `DATABASE_URL_DOCKER`;
- confira `BACKUP_INTERVAL_HOURS`;
- force um backup:

```bash
docker compose exec db-backup /opt/ops/backup-db.sh
```

## Conflito continua aparecendo na fila

Sintoma:

- reconciliação executada, mas a pendência continua aberta.

Ações:

- confira se usou o `conflictId` correto;
- verifique se o item mestre existe;
- rode novamente o script com `--alias` explícito;
- valide no banco se `importacao_conflito.resolvido = true`.

## Recalculo não alterou custos

Sintoma:

- script executa sem erro, mas o custo não muda.

Ações:

- verifique se a ficha ativa está correta;
- confira `dependencia_item`;
- valide se houve atualização de `item_compra` ou da ficha antes do recalculo;
- rode o recalculo com `--item-id` para um subconjunto menor e analise o JSON de impacto.
