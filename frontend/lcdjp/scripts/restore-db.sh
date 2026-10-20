#!/usr/bin/env bash
# Restore a backup made by the mysql-backup service:  scripts/restore-db.sh backups/lcdjp-20261017-030000.sql.gz
# This REPLACES the current contents of the lcdjp database. Stop the app first:  docker compose stop lcdjp-app
set -euo pipefail
cd "$(dirname "$0")/.."
file="${1:?usage: scripts/restore-db.sh <backup.sql.gz>}"
[[ -f "$file" ]] || { echo "no such file: $file"; exit 1; }
read -r -p "Replace the lcdjp database with $file ? type yes: " answer
[[ "$answer" == "yes" ]] || { echo "cancelled"; exit 1; }
gunzip -c "$file" | docker exec -i lcdjp-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root lcdjp'
echo "restored. Start the app again:  docker compose start lcdjp-app"
