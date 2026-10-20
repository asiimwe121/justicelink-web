#!/usr/bin/env bash
# Brings a database whose V1-V4 migrations were edited after they ran back in line with the files in this build.
#
#   scripts/fix-flyway-checksums.sh
#
# What it does, in order:
#   1. prints flyway_schema_history
#   2. checks that every column V1-V3 (+ V4's deactivated_at) create exists in the database
#      (contact_requests and legal_aid_organizations are skipped: step 4 creates them; four unused users columns are ignored)
#   3. backs the database up to backups/
#   4. after you type "yes": creates contact_requests and legal_aid_organizations if missing
#      (the exact CREATE TABLE IF NOT EXISTS statements from V1), then updates the V1-V4 checksums
#   5. restarts the lcdjp-backend container (by name, so no compose file is needed) and waits for it to report healthy
# Run on the server from the repo checkout (it switches to the folder holding docker-compose.yml and .env).
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] || { echo "No .env next to docker-compose.yml in $(pwd)"; exit 1; }

ROOT_PW="${MYSQL_ROOT_PASSWORD:-$(grep -E '^MYSQL_ROOT_PASSWORD=' .env | cut -d= -f2- || true)}"
sql() { docker exec -i -e MYSQL_PWD="$ROOT_PW" lcdjp-mysql mysql -u root lcdjp "$@"; }

if ! sql -e "SELECT 1" >/dev/null 2>&1; then
  echo "The MySQL root password from .env was not accepted (MySQL keeps the password it was first created with)."
  read -r -s -p "MySQL root password: " ROOT_PW; echo
  sql -e "SELECT 1" >/dev/null || { echo "Still rejected. Nothing changed."; exit 1; }
fi

echo "== Current migration history"
sql -e "SELECT installed_rank, version, description, checksum, success FROM flyway_schema_history ORDER BY installed_rank;"

echo "== Schema drift check (columns that V1-V4 create but the database lacks)"
DRIFT="$(sql -N < scripts/flyway-drift-check.sql)"
if [ -n "$DRIFT" ]; then
  echo "$DRIFT"
  echo "These columns are missing, so V1-V4 changed what the SQL does. Not updating checksums. Nothing changed."
  exit 1
fi
echo "None missing."
echo "(Ignored on purpose: users.otp_code, users.otp_expiry, users.declined_lawyers, users.routing_choice. V1 lists them on users; the app does not use them there.)"

echo "== cases columns the application needs (routing_choice, declined_lawyers)"
CASE_COLS="$(sql -N -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='lcdjp' AND table_name='cases' AND column_name IN ('routing_choice','declined_lawyers');")"
if [ "$CASE_COLS" != "2" ]; then
  echo "WARNING: cases has $CASE_COLS of 2 of those columns. Case routing/offers will fail until they exist. This script does not change that; tell whoever is helping you."
else
  echo "Both present."
fi

echo "== Tables that will be created if absent"
sql -e "SELECT table_name FROM information_schema.tables WHERE table_schema='lcdjp' AND table_name IN ('contact_requests','legal_aid_organizations');"
echo "(Any of the two not listed above will be created.)"

mkdir -p backups
BACKUP="backups/pre-flyway-fix-$(date +%Y%m%d-%H%M%S).sql"
echo "== Backing up database to $BACKUP"
docker exec -e MYSQL_PWD="$ROOT_PW" lcdjp-mysql mysqldump -u root --single-transaction lcdjp > "$BACKUP"

read -r -p "Apply the table creation and checksum update? Type yes to continue: " ok
[ "${ok,,}" = "yes" ] || { echo "Aborted, nothing changed."; exit 1; }

sql < scripts/flyway-create-missing-tables.sql

# Each UPDATE only fires if the stored checksum is the one from the original error.
sql <<'SQL'
UPDATE flyway_schema_history SET checksum =  500594320 WHERE version = '1' AND checksum =  704786947;
UPDATE flyway_schema_history SET checksum = -491045887 WHERE version = '2' AND checksum = 1182931504;
UPDATE flyway_schema_history SET checksum = 1140316259 WHERE version = '3' AND checksum = -141341801;
UPDATE flyway_schema_history SET checksum = -384048328 WHERE version = '4' AND checksum = 2057539861;
SELECT version, checksum FROM flyway_schema_history WHERE version IN ('1','2','3','4') ORDER BY installed_rank;
SQL

echo "== Restarting lcdjp-backend"
docker restart lcdjp-backend >/dev/null
for i in $(seq 1 30); do
  status="$(docker inspect lcdjp-backend --format '{{.State.Health.Status}}' 2>/dev/null || echo unknown)"
  [ "$status" = "healthy" ] && break
  sleep 5
done
echo "health: $status"
docker logs lcdjp-backend 2>&1 | grep -E "Started LcdjpApplication|APPLICATION FAILED|checksum mismatch" | tail -2 || true
