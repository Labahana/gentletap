#!/usr/bin/env bash
# Postgres backup for GentleTap — compressed dump + optional off-site sync.
#
# Usage:
#   ./scripts/backup.sh                      # dump gentletap-postgres -> ./backups/
#   BACKUP_DIR=/var/backups ./scripts/backup.sh
#   S3_BUCKET=my-backups ./scripts/backup.sh  # also sync to s3://my-backups/gentletap/
#
# Schedule (cron, daily 03:17):
#   17 3 * * * /opt/gentletap/scripts/backup.sh >> /var/log/gentletap-backup.log 2>&1
#
# Restore:
#   gunzip -c backups/gentletap-YYYYMMDD-HHMMSS.sql.gz | \
#     docker exec -i gentletap-postgres psql -U gentletap -d gentletap

set -euo pipefail

CONTAINER="${PG_CONTAINER:-gentletap-postgres}"
DB_NAME="${POSTGRES_DB:-gentletap}"
DB_USER="${POSTGRES_USER:-gentletap}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
S3_BUCKET="${S3_BUCKET:-}"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/gentletap-${TS}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] dumping ${DB_NAME} from ${CONTAINER} -> ${OUT}"
docker exec -t "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
  --format=plain --no-owner --no-privileges | gzip -9 > "${OUT}"

# Verify the dump is non-trivial (>1KB) — a failed pg_dump above yields an empty file.
SIZE=$(stat -c%s "${OUT}" 2>/dev/null || stat -f%z "${OUT}")
if [ "${SIZE}" -lt 1024 ]; then
  echo "[backup] ERROR: dump too small (${SIZE} bytes) — aborting" >&2
  rm -f "${OUT}"
  exit 1
fi
echo "[backup] wrote ${OUT} (${SIZE} bytes)"

if [ -n "${S3_BUCKET}" ]; then
  echo "[backup] syncing to s3://${S3_BUCKET}/gentletap/"
  aws s3 cp "${OUT}" "s3://${S3_BUCKET}/gentletap/" --storage-class STANDARD_IA
fi

echo "[backup] pruning dumps older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name 'gentletap-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] done"
