#!/usr/bin/env bash
# Nightly MySQL backup that leaves the server.
#
#   1. dumps the lcdjp database from the running lcdjp-mysql container (consistent snapshot, no table locks)
#   2. gzips it into $BACKUP_DIR and checks the file is a valid, non-empty gzip
#   3. uploads it to your S3-compatible bucket (Cloudflare R2) under backups/ using rclone
#   4. deletes local copies older than KEEP_LOCAL_DAYS (3) and bucket copies older than KEEP_REMOTE_DAYS (14)
#   Any failure sends an email through Brevo (see lib-alert.sh) and exits non-zero.
#
# One-time setup on the server:
#   sudo apt install -y rclone          # or: curl https://rclone.org/install.sh | sudo bash
#   chmod +x scripts/*.sh
#   add to .env:  STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY (same ones the app uses)
#                 optional: BACKUP_BUCKET (a separate bucket is better), ALERT_EMAIL
#   crontab -e :  15 2 * * *  /path/to/project/scripts/backup-db.sh
#
# Restore:  gunzip -c lcdjp-YYYYmmdd-HHMM.sql.gz | docker exec -i lcdjp-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" lcdjp'
# Keep FIELD_ENCRYPTION_KEY and JWT_SECRET somewhere safe OFF this server too: the dump cannot be read without them.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-alert.sh"
load_env

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
KEEP_LOCAL_DAYS="${KEEP_LOCAL_DAYS:-3}"
KEEP_REMOTE_DAYS="${KEEP_REMOTE_DAYS:-14}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-lcdjp-mysql}"
DB_NAME="${DB_NAME:-lcdjp}"
BUCKET="${BACKUP_BUCKET:-${STORAGE_BUCKET:-}}"

fail() { send_alert "JusticeLink backup FAILED" "$1 (host: $(hostname))"; exit 1; }
trap 'fail "Unexpected error on line $LINENO"' ERR

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M)"
OUT="$BACKUP_DIR/$DB_NAME-$STAMP.sql.gz"
TMP="$OUT.partial"

log "Dumping $DB_NAME from $MYSQL_CONTAINER"
# The root password stays inside the container's environment, never on a command line.
docker exec "$MYSQL_CONTAINER" sh -c \
  "mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --quick --routines --triggers --hex-blob $DB_NAME" \
  | gzip -6 > "$TMP"

gzip -t "$TMP" || fail "Backup file is not a valid gzip"
SIZE=$(stat -c %s "$TMP")
[ "$SIZE" -gt 1024 ] || fail "Backup file is suspiciously small ($SIZE bytes)"
mv "$TMP" "$OUT"
log "Wrote $OUT ($SIZE bytes)"

if [ -n "$BUCKET" ] && [ -n "${STORAGE_ENDPOINT:-}" ] && command -v rclone >/dev/null 2>&1; then
  export RCLONE_CONFIG_OFFSITE_TYPE=s3
  export RCLONE_CONFIG_OFFSITE_PROVIDER=Other
  export RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="${STORAGE_ACCESS_KEY:-}"
  export RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="${STORAGE_SECRET_KEY:-}"
  export RCLONE_CONFIG_OFFSITE_ENDPOINT="$STORAGE_ENDPOINT"
  export RCLONE_CONFIG_OFFSITE_REGION="${STORAGE_REGION:-auto}"
  export RCLONE_CONFIG_OFFSITE_NO_CHECK_BUCKET=true
  rclone copyto "$OUT" "OFFSITE:$BUCKET/backups/$(basename "$OUT")" || fail "Upload to the bucket failed; the backup is only on this server"
  log "Uploaded to $BUCKET/backups/"
  rclone delete "OFFSITE:$BUCKET/backups" --min-age "${KEEP_REMOTE_DAYS}d" || log "Could not prune old remote backups"
else
  fail "Off-server upload skipped: need rclone installed and STORAGE_ENDPOINT / bucket / keys in .env. A backup that stays on this disk is lost with the disk."
fi

find "$BACKUP_DIR" -name "$DB_NAME-*.sql.gz" -mtime +"$KEEP_LOCAL_DAYS" -delete
log "Backup finished"
