#!/usr/bin/env bash
# JusticeLink nightly MySQL backup: dump -> gzip -> encrypt -> checksum -> prune -> offsite -> heartbeat.
# Documents are stored in the database (documents.file_data), so this one dump covers case files too.
set -Eeuo pipefail

: "${DB_HOST:=127.0.0.1}" "${DB_PORT:=3306}" "${DB_NAME:=lcdjp}"
: "${DB_USER:?set DB_USER}" "${DB_PASSWORD:?set DB_PASSWORD}"
: "${BACKUP_DIR:=/var/backups/justicelink}"
: "${BACKUP_PASSPHRASE_FILE:?path to a file holding the backup encryption passphrase}"
: "${RETENTION_DAYS:=14}"
# Optional: BACKUP_REMOTE (an rclone remote:path), HEALTHCHECK_URL (dead-man's-switch ping URL)

ping_hc() { [[ -n "${HEALTHCHECK_URL:-}" ]] && curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}$1" >/dev/null || true; }
trap 'echo "[backup] FAILED at line $LINENO" >&2; ping_hc /fail' ERR

umask 077
mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/${DB_NAME}_${stamp}.sql.gz.enc"
ping_hc /start

# --single-transaction: consistent snapshot without locking InnoDB tables.
MYSQL_PWD="$DB_PASSWORD" mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --quick --routines --triggers --events --set-gtid-purged=OFF \
  --default-character-set=utf8mb4 "$DB_NAME" \
  | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$BACKUP_PASSPHRASE_FILE" -out "$out"

# Sanity: the file must decrypt and decompress cleanly, and look like a dump.
openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$BACKUP_PASSPHRASE_FILE" -in "$out" | gzip -t
openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$BACKUP_PASSPHRASE_FILE" -in "$out" | gunzip | tail -n 3 | grep -q "Dump completed"
sha256sum "$out" > "$out.sha256"
echo "[backup] wrote $out ($(du -h "$out" | cut -f1))"

find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz.enc*" -mtime +"$RETENTION_DAYS" -delete

if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  rclone copy "$out" "$BACKUP_REMOTE" && rclone copy "$out.sha256" "$BACKUP_REMOTE"
  echo "[backup] copied offsite to $BACKUP_REMOTE"
else
  echo "[backup] WARNING: no BACKUP_REMOTE set; backup exists only on this machine" >&2
fi

ping_hc ""
