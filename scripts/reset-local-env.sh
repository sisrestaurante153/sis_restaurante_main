#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[reset] Limpando estado local do modo degradado"
python3 - <<'PY'
from pathlib import Path
import shutil

root = Path.cwd()
for relative in ["artifacts/runtime/demo-store.json", "playwright-report", "test-results", ".next"]:
    path = root / relative
    if path.is_dir():
        shutil.rmtree(path, ignore_errors=True)
    elif path.exists():
        path.unlink()
PY

echo "[reset] Regenerando cliente Prisma"
npx prisma generate >/dev/null

DB_READY=0

if docker info >/dev/null 2>&1; then
  echo "[reset] Docker disponivel, tentando reciclar PostgreSQL"
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
  docker compose up -d db >/dev/null
  python3 - <<'PY'
import socket
import time

deadline = time.time() + 45
while time.time() < deadline:
    sock = socket.socket()
    sock.settimeout(1)
    try:
        sock.connect(("127.0.0.1", 5432))
    except OSError:
        time.sleep(1)
    else:
        sock.close()
        raise SystemExit(0)
    finally:
        sock.close()
raise SystemExit(1)
PY
  DB_READY=1
else
  echo "[reset] Docker indisponivel ou sem permissao; mantendo apenas o modo degradado persistente"
fi

if [ "$DB_READY" -eq 1 ]; then
  echo "[reset] Aplicando reset do banco e seed"
  npx prisma migrate reset --force --skip-generate
  npm run db:seed >/dev/null
fi

echo "[reset] Ambiente pronto"
