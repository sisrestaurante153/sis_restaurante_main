# Rollback

## Quando usar

- migração aplicada com comportamento inesperado;
- regressão funcional crítica no app;
- falha operacional após deploy.

## Rollback de aplicação sem restore de banco

Use quando o problema está no build/configuração e o schema continua compatível.

1. Identifique a versão anterior da imagem ou do commit.
2. Rebuild/republique a versão anterior.
3. Suba novamente:

```bash
docker compose up -d --build app proxy
```

4. Valide:

- `/api/health`
- login
- consulta de itens/fichas

## Rollback com restore de banco

Use quando o schema ou os dados foram comprometidos.

1. Pare escrita da aplicação:

```bash
docker compose stop proxy app
```

2. Garanta o arquivo `.dump` correto.
3. Execute o restore no host:

```bash
DATABASE_URL=postgresql://... ./scripts/ops/restore-db.sh ./artifacts/backups/<arquivo.dump>
```

4. Reaplique migrations compatíveis com a versão restaurada se necessário.
5. Suba app e proxy:

```bash
docker compose up -d app proxy
```

## Checklist pós-rollback

- banco saudável;
- `/api/health` retornando `ok` ou `degraded` apenas se o banco estiver intencionalmente fora;
- login administrativo funcionando;
- recalculo manual executando;
- fila de pendências acessível.
