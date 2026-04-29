# Deploy em VPS Contabo com subdominio

## Objetivo

Publicar o sistema em um subdominio como `sis.felipeb.tech` sem conflitar com o site principal `felipeb.tech`.

## Topologia recomendada

- `felipeb.tech`: continua apontando para o portfolio atual.
- `sis.felipeb.tech`: novo subdominio para este sistema.
- `docker compose` deste projeto: sobe `db`, `migrate`, `app`, `proxy`, `import-worker` e `db-backup`.
- `Nginx` do host: termina HTTPS em `443` e encaminha para o `proxy` Docker em `127.0.0.1:8081`.

Essa abordagem evita disputar as portas `80` e `443` entre projetos hospedados na mesma VPS.

## 1. DNS

Crie um registro `A`:

- Host: `sis`
- Tipo: `A`
- Valor: IP publico da VPS

Resultado esperado:

- `sis.felipeb.tech` -> IP da VPS

## 2. Preparar a VPS

Assumindo Ubuntu ou Debian:

```bash
sudo apt update
sudo apt install -y nginx snapd git
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

Se `ufw` estiver ativo:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

## 3. Baixar o projeto

```bash
cd /opt
sudo mkdir -p /opt/sis-restaurante
sudo chown $USER:$USER /opt/sis-restaurante
git clone <URL_DO_REPOSITORIO> /opt/sis-restaurante
cd /opt/sis-restaurante
```

## 4. Criar o ambiente de producao

```bash
cp .env.production.example .env
```

Preencha pelo menos:

```env
APP_URL=https://sis.felipeb.tech
SESSION_SECRET=gere-um-segredo-bem-longo-e-unico
POSTGRES_PASSWORD=gere-uma-senha-forte
DATABASE_URL=postgresql://sis:gere-uma-senha-forte@127.0.0.1:5432/sis_restaurante?schema=public
DATABASE_URL_DOCKER=postgresql://sis:gere-uma-senha-forte@db:5432/sis_restaurante?schema=public
PROXY_HTTP_PORT=127.0.0.1:8081
POSTGRES_EXPOSE_PORT=127.0.0.1:5432
RUN_DB_SEED=false
```

## 5. Subir os containers

```bash
docker compose up -d --build
```

Verificacao inicial:

```bash
docker compose ps
docker compose logs -f migrate
docker compose logs -f app
curl http://127.0.0.1:8081/healthz
curl http://127.0.0.1:8081/api/health
```

## 6. Configurar o Nginx do host para o subdominio

Crie o arquivo:

```bash
sudo tee /etc/nginx/sites-available/sis-restaurante > /dev/null <<'EOF'
server {
    listen 80;
    server_name sis.felipeb.tech;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
EOF
```

Ative o site e valide:

```bash
sudo ln -sf /etc/nginx/sites-available/sis-restaurante /etc/nginx/sites-enabled/sis-restaurante
sudo nginx -t
sudo systemctl reload nginx
```

Teste antes do certificado:

```bash
curl -I http://sis.felipeb.tech
curl https://sis.felipeb.tech/api/health
```

O segundo comando pode falhar nesta etapa porque o certificado ainda nao existe.

## 7. Emitir HTTPS com Certbot

```bash
sudo certbot --nginx -d sis.felipeb.tech
```

Aceite o redirecionamento para HTTPS quando o assistente perguntar.

Depois valide:

```bash
curl -I https://sis.felipeb.tech
curl https://sis.felipeb.tech/api/health
```

## 8. Deploys futuros

```bash
cd /opt/sis-restaurante
git pull
docker compose up -d --build
docker compose logs -f app
```

## 9. Comandos uteis

Logs:

```bash
cd /opt/sis-restaurante
docker compose logs -f app
docker compose logs -f proxy
docker compose logs -f db
docker compose logs -f import-worker
docker compose logs -f db-backup
```

Status:

```bash
cd /opt/sis-restaurante
docker compose ps
```

Backup manual:

```bash
cd /opt/sis-restaurante
docker compose exec db-backup /opt/ops/backup-db.sh
```

Migration manual:

```bash
cd /opt/sis-restaurante
docker compose run --rm migrate
```

## Observacoes

- Se o portfolio ja estiver atras de um Nginx no host, basta adicionar este novo `server_name`.
- Se o portfolio usar outro reverse proxy na borda, mantenha este projeto em `127.0.0.1:8081` e replique a mesma regra do subdominio no proxy atual.
- O valor `APP_URL` precisa bater exatamente com a URL publica para que login, logout e rotas internas funcionem corretamente.
