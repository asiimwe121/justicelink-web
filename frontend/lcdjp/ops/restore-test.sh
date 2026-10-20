#!/usr/bin/env bash
# Restores the newest backup into a throwaway database and checks it. Run monthly.
# Never touches the live database: it creates and drops <DB_NAME>_restore_test.
set -Eeuo pipefail

: "${DB_HOST:=127.0.0.1}" "${DB_PORT:=3306}" "${DB_NAME:=lcdjp}"
: "${DB_USER:?}" "${DB_PASSWORD:?}" "${BACKUP_PASSPHRASE_FILE:?}"
: "${BACKUP_DIR:=/var/backups/justicelink}"
: "${MAX_AGE_HOURS:=26}"
scratch="${DB_NAME}_restore_test"
mysqlc() { MYSQL_PWD="$DB_PASSWORD" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$@"; }

latest="$(ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz.enc 2>/dev/null | head -n1 || true)"
[[ -n "$latest" ]] || { echo "[restore-test] FAIL: no backups in $BACKUP_DIR" >&2; exit 1; }

age_h=$(( ( $(date +%s) - $(stat -c %Y "$latest") ) / 3600 ))
(( age_h <= MAX_AGE_HOURS )) || { echo "[restore-test] FAIL: newest backup is ${age_h}h old" >&2; exit 1; }
( cd "$BACKUP_DIR" && sha256sum -c "$(basename "$latest").sha256" )

mysqlc -e "DROP DATABASE IF EXISTS \`$scratch\`; CREATE DATABASE \`$scratch\` CHARACTER SET utf8mb4;"
trap 'mysqlc -e "DROP DATABASE IF EXISTS \`$scratch\`;" >/dev/null 2>&1 || true' EXIT

openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$BACKUP_PASSPHRASE_FILE" -in "$latest" | gunzip | mysqlc "$scratch"

fail=0
for t in users cases documents audit_logs legal_document_chunks; do
  restored=$(mysqlc -N -e "SELECT COUNT(*) FROM \`$scratch\`.\`$t\`")
  live=$(mysqlc -N -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$t\`")
  echo "[restore-test] $t: restored=$restored live=$live"
  # Live may have grown since the backup, but a restore with FEWER rows than 90% of live is suspect.
  if (( restored * 10 < live * 9 )); then echo "[restore-test] FAIL: $t looks short" >&2; fail=1; fi
done
(( fail == 0 )) || exit 1
echo "[restore-test] OK: $(basename "$latest") restored and verified"
[[ -n "${HEALTHCHECK_URL:-}" ]] && curl -fsS -m 10 "${HEALTHCHECK_URL}" >/dev/null || true
