#!/bin/sh
set -eu

INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"

while true
do
  /opt/ops/backup-db.sh
  sleep "$((INTERVAL_HOURS * 3600))"
done
