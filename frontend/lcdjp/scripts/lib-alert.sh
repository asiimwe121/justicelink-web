#!/usr/bin/env bash
# Shared helpers for backup-db.sh and disk-check.sh. Sourced, not run.
#
# Reads the same .env file docker compose uses (BREVO_API_KEY, BREVO_SENDER_EMAIL, ...) plus optional
#   ALERT_EMAIL   where warnings go (default: BREVO_SENDER_EMAIL)
# Every alert is also written to the log file, so a failed email never hides the problem.

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/logs/ops-scripts.log}"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

load_env() {
  if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$PROJECT_DIR/.env"
    set +a
  fi
}

log() { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [$(basename "$0")] $*" | tee -a "$LOG_FILE" >&2; }

# send_alert "subject" "body"
send_alert() {
  local subject="$1" body="$2" to="${ALERT_EMAIL:-${BREVO_SENDER_EMAIL:-}}"
  log "ALERT: $subject :: $body"
  if [ -z "${BREVO_API_KEY:-}" ] || [ -z "$to" ] || [ -z "${BREVO_SENDER_EMAIL:-}" ]; then
    log "No BREVO_API_KEY / sender / ALERT_EMAIL set, so the alert was only logged"
    return 0
  fi
  # Build the JSON without extra tools: escape backslashes, quotes and newlines.
  local esc_subject esc_body
  esc_subject=$(printf '%s' "$subject" | sed 's/\\/\\\\/g; s/"/\\"/g')
  esc_body=$(printf '%s' "$body" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}')
  curl -sS --max-time 20 -o /dev/null -w '' \
    -X POST https://api.brevo.com/v3/smtp/email \
    -H "api-key: $BREVO_API_KEY" -H 'content-type: application/json' \
    -d "{\"sender\":{\"email\":\"$BREVO_SENDER_EMAIL\",\"name\":\"JusticeLink server\"},\"to\":[{\"email\":\"$to\"}],\"subject\":\"$esc_subject\",\"textContent\":\"$esc_body\"}" \
    || log "Could not reach Brevo to send the alert email"
}
