#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ] && [ -f ".env" ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL nao configurada."
  exit 1
fi

echo "[ops] Aplicando migracoes Prisma"
npx prisma migrate deploy

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "[ops] Executando seed de bootstrap"
  npm run db:seed
else
  echo "[ops] Seed desativada; defina RUN_DB_SEED=true para popular dados iniciais."
fi
