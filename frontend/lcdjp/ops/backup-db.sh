#!/usr/bin/env bash
# Nightly MySQL backup for JusticeLink.
#
#   - dumps the database from the running MySQL container (consistent snapshot, no table locks)
#   - compresses it and refuses to keep a file that fails an integrity check
#   - optionally copies it off the server (BACKUP_REMOTE, via rclone) -- a backup that
#     lives only on the machine it protects is not a backup
#   - deletes local backups older than BACKUP_KEEP_DAYS
#   - pings HEALTHCHECK_PING_URL on success (and /fail on failure) so a silent failure is noticed
#
# Settings (environment, all optional):
#   MYSQL_CONTAINER     default lcdjp-mysql
#   BACKUP_DIR          default /var/backups/justicelink
#   BACKUP_KEEP_DAYS    default 14
#   BACKUP_REMOTE       e.g. "b2:justicelink-backups"  (needs rclone configured)
#   HEALTHCHECK_PING_URL  e.g. https://hc-ping.com/<uuid>
set -Eeuo pipefail

CONTAINER="${MYSQL_CONTAINER:-lcdjp-mysql}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/justicelink}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/lcdjp-$STAMP.sql.gz"
PING="${HEALTHCHECK_PING_URL:-}"

ping_url() { [ -n "$PING" ] && curl -fsS -m 10 --retry 3 -o /dev/null "$1" || true; }
on_error() { echo "[backup] FAILED at line $1" >&2; rm -f "$FILE"; ping_url "${PING%/}/fail"; exit 1; }
trap 'on_error $LINENO' ERR

mkdir -p "$BACKUP_DIR"
umask 077

echo "[backup] dumping from container $CONTAINER"
# The password and database name are read inside the container so they never appear on this host's process list.
docker exec "$CONTAINER" sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --events --hex-blob --no-tablespaces "${MYSQL_DATABASE:-lcdjp}"' \
  | gzip -9 > "$FILE"

gzip -t "$FILE"                                   # corrupt archive -> error -> trap
SIZE=$(stat -c %s "$FILE")
if [ "$SIZE" -lt 2048 ]; then
  echo "[backup] dump is suspiciously small ($SIZE bytes)" >&2
  false
fi
zcat "$FILE" | grep -q "CREATE TABLE" || { echo "[backup] dump contains no tables" >&2; false; }
echo "[backup] wrote $FILE ($SIZE bytes)"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "[backup] copying off-site to $BACKUP_REMOTE"
  rclone copy "$FILE" "$BACKUP_REMOTE"
fi

find "$BACKUP_DIR" -name 'lcdjp-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
ping_url "$PING"
echo "[backup] done"
