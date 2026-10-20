#!/usr/bin/env bash
# Daily "is the disk filling up?" check. Emails (and logs) when disk use passes DISK_WARN_PERCENT (default 80),
# and also when no fresh database backup exists. At most one disk email per 24 hours so it never spams you.
#
#   crontab -e :  30 7 * * *  /path/to/project/scripts/disk-check.sh
#
# Optional .env settings: DISK_PATH (default /), DISK_WARN_PERCENT (80), ALERT_EMAIL, BACKUP_DIR, BACKUP_MAX_AGE_HOURS (36)
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-alert.sh"
load_env

DISK_PATH="${DISK_PATH:-/}"
WARN="${DISK_WARN_PERCENT:-80}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-36}"
STATE_DIR="${STATE_DIR:-$PROJECT_DIR/logs}"
STATE_FILE="$STATE_DIR/.disk-alert-sent"

USED=$(df --output=pcent "$DISK_PATH" | tail -1 | tr -dc '0-9')
log "Disk use on $DISK_PATH: ${USED}% (warn at ${WARN}%)"

if [ "$USED" -ge "$WARN" ]; then
  if [ -f "$STATE_FILE" ] && [ -z "$(find "$STATE_FILE" -mmin +1440 2>/dev/null)" ]; then
    log "Disk alert already sent in the last 24 hours"
  else
    DETAIL="$(df -h "$DISK_PATH" | tail -2)

Docker usage:
$(docker system df 2>/dev/null || echo 'docker not available')

Largest Docker volumes:
$(du -sh /var/lib/docker/volumes/*/_data 2>/dev/null | sort -h | tail -5 || true)

Quick wins: docker system prune -f ; check backups/ and logs/ ; run OPTIMIZE TABLE after moving files to the bucket."
    send_alert "JusticeLink server disk is ${USED}% full" "$DETAIL"
    touch "$STATE_FILE"
  fi
fi

if [ -d "$BACKUP_DIR" ]; then
  if [ -z "$(find "$BACKUP_DIR" -name '*.sql.gz' -mmin -$((BACKUP_MAX_AGE_HOURS * 60)) 2>/dev/null | head -1)" ]; then
    send_alert "JusticeLink: no database backup in the last ${BACKUP_MAX_AGE_HOURS} hours" \
      "Nothing newer than ${BACKUP_MAX_AGE_HOURS}h found in $BACKUP_DIR. Run scripts/backup-db.sh by hand and check cron."
  fi
else
  log "No backup directory yet ($BACKUP_DIR); skipping backup freshness check"
fi
