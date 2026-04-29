# Deploy de Produção

## Pré-requisitos

- Docker Engine + Docker Compose Plugin
- Porta `80/tcp` liberada para o proxy
- Volume persistente para PostgreSQL e backups
- `SESSION_SECRET` forte e exclusivo por ambiente

## Preparar ambiente

1. Copie o arquivo de exemplo:

```bash
cp .env.production.example .env
```

2. Ajuste, no mínimo:

- `APP_URL`
- `SESSION_SECRET`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `DATABASE_URL_DOCKER`

Se a aplicacao for publicada em subpath, informe a URL completa em `APP_URL`.

Exemplo:

```env
APP_URL=https://felipeb.tech/sisfichas
```

O build deriva o `basePath` a partir desse valor, o que garante que rotas internas como login, logout e downloads continuem funcionando atras do proxy.

## Subir em produção

### Deploy limpo sem massa demo

```bash
docker compose up -d --build
```

O fluxo é:

1. `db` sobe e fica saudável.
2. `migrate` executa `prisma migrate deploy`.
3. `app` sobe somente após `migrate` concluir com sucesso.
4. `proxy` sobe quando o healthcheck do app estiver verde.
5. `db-backup` inicia o loop básico de backups.

### Bootstrap com seed de demonstração

Use apenas em homologação/laboratório:

```bash
docker compose run --rm -e RUN_DB_SEED=true migrate
docker compose up -d app proxy db-backup
```

## Healthchecks

- App interno: `http://127.0.0.1:3000/api/health`
- Proxy exposto sem subpath: `http://<host>/api/health`
- Proxy exposto com subpath: `http://<host>/<basePath>/api/health`
- Proxy local: `http://<host>/healthz`

## Logs úteis

```bash
docker compose logs -f migrate
docker compose logs -f app
docker compose logs -f proxy
docker compose logs -f db
docker compose logs -f db-backup
```

## Migração manual

Se precisar reaplicar migrations fora do `up`:

```bash
docker compose run --rm migrate
```

## Janela de manutenção recomendada

- backup manual antes de cada deploy;
- `docker compose pull` ou rebuild da imagem;
- `docker compose up -d --build`;
- validar `/api/health`, login e uma ficha crítica.
