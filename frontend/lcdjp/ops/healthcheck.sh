#!/usr/bin/env bash
# Run every minute from cron on a machine OTHER than the app server (a free VPS, a Raspberry Pi,
# or any always-on computer). It checks the public site and the health endpoint, and calls a
# webhook when something is down -- once when it breaks, once when it recovers.
#
# Settings (environment):
#   SITE_URL           default https://justicelinkug.org
#   ALERT_WEBHOOK      URL that receives a JSON POST {"text": "..."} (Slack/Discord/Teams/ntfy-compatible)
#   STATE_FILE         default /tmp/justicelink-health.state
#
# Prefer a hosted checker? UptimeRobot / Better Stack / Healthchecks.io do the same job with a
# status page: point them at $SITE_URL/actuator/health and expect HTTP 200 containing "UP".
set -uo pipefail

SITE_URL="${SITE_URL:-https://justicelinkug.org}"
STATE_FILE="${STATE_FILE:-/tmp/justicelink-health.state}"
WEBHOOK="${ALERT_WEBHOOK:-}"

alert() {
  echo "$(date -u +%FT%TZ) $1"
  [ -n "$WEBHOOK" ] || return 0
  curl -fsS -m 10 -H 'Content-Type: application/json' \
       -d "{\"text\":\"$1\"}" "$WEBHOOK" >/dev/null 2>&1 || true
}

body="$(curl -fsS -m 15 "$SITE_URL/actuator/health" 2>/dev/null || true)"
page_code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$SITE_URL/" 2>/dev/null || echo 000)"

if echo "$body" | grep -q '"status":"UP"' && [ "$page_code" = "200" ]; then
  current=up
else
  current=down
fi

previous="$(cat "$STATE_FILE" 2>/dev/null || echo up)"
if [ "$current" != "$previous" ]; then
  if [ "$current" = down ]; then
    alert "JusticeLink is DOWN (health: ${body:-no response}, home page HTTP $page_code) -- $SITE_URL"
  else
    alert "JusticeLink is back UP -- $SITE_URL"
  fi
fi
echo "$current" > "$STATE_FILE"
[ "$current" = up ]
