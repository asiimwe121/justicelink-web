#!/usr/bin/env bash
# Deploy the current git commit with a rollback path.
#   scripts/deploy.sh             build, start, wait for healthy; on failure restart the previous tag
#   scripts/deploy.sh rollback    start the tag recorded before the last successful deploy (no rebuild)
# Each deploy builds image lcdjp-backend:<git sha>, so a rollback is just "start the older tag".
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER=lcdjp-backend
WAIT_SECONDS="${WAIT_SECONDS:-240}"
CURRENT_FILE=.deployed_tag
PREVIOUS_FILE=.previous_tag

wait_healthy() {
  local deadline=$((SECONDS + WAIT_SECONDS))
  while (( SECONDS < deadline )); do
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo missing)
    [[ "$status" == "healthy" ]] && return 0
    sleep 5
  done
  return 1
}

start_tag() {
  APP_TAG="$1" docker compose up -d --no-build lcdjp-app
}

if [[ "${1:-}" == "rollback" ]]; then
  [[ -f "$PREVIOUS_FILE" ]] || { echo "no previous tag recorded"; exit 1; }
  tag=$(cat "$PREVIOUS_FILE")
  echo "rolling back to $tag"
  start_tag "$tag"
  wait_healthy || { echo "rollback did not become healthy"; exit 1; }
  cp "$PREVIOUS_FILE" "$CURRENT_FILE"
  echo "rolled back to $tag"
  exit 0
fi

# Preflight: refuse to deploy with an empty required secret, and say so if the app port is open to the world.
if [[ -f .env ]]; then
  missing=()
  for v in DB_PASSWORD MYSQL_ROOT_PASSWORD REDIS_PASSWORD JWT_SECRET BREVO_API_KEY GOOGLE_MAPS_API_KEY HUGGINGFACE_API_KEY; do
    val=$(grep -E "^${v}=" .env | tail -n1 | cut -d= -f2- || true)
    [[ -z "${val//[[:space:]]/}" ]] && missing+=("$v")
  done
  if (( ${#missing[@]} )); then
    echo "refusing to deploy: empty in .env: ${missing[*]}"
    exit 1
  fi
  jwt=$(grep -E "^JWT_SECRET=" .env | tail -n1 | cut -d= -f2-)
  (( ${#jwt} >= 32 )) || { echo "refusing to deploy: JWT_SECRET must be at least 32 characters"; exit 1; }
  grep -qE "^APP_BIND_ADDRESS=127\.0\.0\.1" .env || echo "warning: APP_BIND_ADDRESS is not 127.0.0.1, so port 8080 is reachable directly (fine only if a firewall or another host's proxy is in front)"
else
  echo "refusing to deploy: .env not found"; exit 1
fi

new_tag=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)
old_tag=$(cat "$CURRENT_FILE" 2>/dev/null || true)

echo "building lcdjp-backend:$new_tag"
APP_TAG="$new_tag" docker compose build lcdjp-app
echo "starting $new_tag"
APP_TAG="$new_tag" docker compose up -d lcdjp-app

if wait_healthy && { ./scripts/smoke.sh || { echo "smoke test failed on $new_tag"; false; }; }; then
  [[ -n "$old_tag" && "$old_tag" != "$new_tag" ]] && echo "$old_tag" > "$PREVIOUS_FILE"
  echo "$new_tag" > "$CURRENT_FILE"
  echo "deployed $new_tag"
  # keep the newest 3 images for quick rollback
  docker images lcdjp-backend --format '{{.Tag}}' | grep -v '^latest$' | tail -n +4 | xargs -r -I{} docker rmi lcdjp-backend:{} || true
else
  echo "$new_tag did not become healthy or failed its smoke test (waited up to ${WAIT_SECONDS}s)"
  docker logs --tail 80 "$CONTAINER" || true
  if [[ -n "$old_tag" ]]; then
    echo "restarting previous tag $old_tag"
    start_tag "$old_tag"
  fi
  exit 1
fi
