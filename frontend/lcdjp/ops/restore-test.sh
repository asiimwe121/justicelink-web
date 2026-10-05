#!/usr/bin/env bash
# Proves the newest backup can actually be restored. Run it monthly (or after any schema change).
#
# Loads the backup into a throw-away MySQL container -- production is never touched --
# then checks that the key tables exist and that the user count is plausible.
#
#   ./restore-test.sh                       # newest backup in BACKUP_DIR
#   ./restore-test.sh /path/to/backup.sql.gz
#
# Settings: BACKUP_DIR (default /var/backups/justicelink), MYSQL_IMAGE (default mysql:8.0),
#           HEALTHCHECK_PING_URL (optional; pinged on success, /fail on failure)
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/justicelink}"
IMAGE="${MYSQL_IMAGE:-mysql:8.0}"
PING="${HEALTHCHECK_PING_URL:-}"
NAME="lcdjp-restore-test-$$"
ROOTPW="restore-test-$RANDOM$RANDOM"

ping_url() { [ -n "$PING" ] && curl -fsS -m 10 --retry 3 -o /dev/null "$1" || true; }
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
on_error() { echo "[restore-test] FAILED at line $1" >&2; ping_url "${PING%/}/fail"; cleanup; exit 1; }
trap cleanup EXIT
trap 'on_error $LINENO' ERR

BACKUP="${1:-$(ls -1t "$BACKUP_DIR"/lcdjp-*.sql.gz 2>/dev/null | head -1)}"
[ -n "$BACKUP" ] && [ -f "$BACKUP" ] || { echo "[restore-test] no backup found" >&2; false; }
echo "[restore-test] using $BACKUP"
gzip -t "$BACKUP"

docker run -d --name "$NAME" -e MYSQL_ROOT_PASSWORD="$ROOTPW" -e MYSQL_DATABASE=lcdjp "$IMAGE" >/dev/null
echo -n "[restore-test] waiting for MySQL"
for _ in $(seq 1 60); do
  docker exec "$NAME" mysqladmin ping -uroot -p"$ROOTPW" --silent >/dev/null 2>&1 && break
  echo -n "."; sleep 2
done
echo
docker exec "$NAME" mysqladmin ping -uroot -p"$ROOTPW" --silent >/dev/null

zcat "$BACKUP" | docker exec -i "$NAME" mysql -uroot -p"$ROOTPW" lcdjp

q() { docker exec "$NAME" mysql -uroot -p"$ROOTPW" -N -B lcdjp -e "$1" 2>/dev/null; }
TABLES=$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='lcdjp'")
for t in users cases login_lockouts password_reset_links session_revocations; do
  EXISTS=$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='lcdjp' AND table_name='$t'")
  if [ "$EXISTS" != "1" ]; then echo "[restore-test] missing table: $t" >&2; false; fi
done
USERS=$(q "SELECT COUNT(*) FROM users")
[ "$USERS" -ge 1 ] || { echo "[restore-test] users table is empty" >&2; false; }

echo "[restore-test] OK: $TABLES tables restored, $USERS users"
ping_url "$PING"
