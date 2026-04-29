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

if [ "${1:-}" = "" ]; then
  echo "Uso: ./scripts/ops/restore-db.sh <arquivo.dump>"
  exit 1
fi

BACKUP_FILE="$1"
DATABASE_URL_CLI="${DATABASE_URL%%\?*}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Arquivo de backup nao encontrado: ${BACKUP_FILE}"
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "${DATABASE_URL_CLI}" \
  "${BACKUP_FILE}"
