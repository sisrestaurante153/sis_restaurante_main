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

BACKUP_DIR="${BACKUP_DIR:-./artifacts/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/sis-restaurante-${TIMESTAMP}.dump"
DATABASE_URL_CLI="${DATABASE_URL%%\?*}"

mkdir -p "${BACKUP_DIR}"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "${BACKUP_FILE}" \
  "${DATABASE_URL_CLI}"

find "${BACKUP_DIR}" -type f -name 'sis-restaurante-*.dump' -mtime +"${RETENTION_DAYS}" -delete

echo "${BACKUP_FILE}"
