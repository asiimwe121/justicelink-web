#!/usr/bin/env bash
# Resolve the current digest of every base image and write the pinned references into .env,
# so builds and restarts always get byte-identical images until you deliberately re-run this.
#
#   scripts/pin-digests.sh          # pin to whatever the tags point at right now
#   (then test, and deploy as usual)
#
# Needs Docker with buildx (default in current Docker). Re-run to take base-image security updates.
set -euo pipefail
cd "$(dirname "$0")/.."

# VAR=tag  (keep in sync with the defaults in docker-compose.yml / Dockerfile)
IMAGES=(
  "MYSQL_IMAGE=mysql:8.4"
  "REDIS_IMAGE=redis:7.4-alpine"
  "MAVEN_IMAGE=maven:3.9.6-eclipse-temurin-17"
  "JRE_IMAGE=eclipse-temurin:17-jre-jammy"
)
ENV_FILE=.env
touch "$ENV_FILE"

for entry in "${IMAGES[@]}"; do
  var=${entry%%=*}; tag=${entry#*=}
  digest=$(docker buildx imagetools inspect "$tag" | awk '/^Digest:/ {print $2; exit}')
  [[ $digest == sha256:* ]] || { echo "could not resolve digest for $tag" >&2; exit 1; }
  sed -i "/^${var}=/d" "$ENV_FILE"
  echo "${var}=${tag}@${digest}" >> "$ENV_FILE"
  echo "pinned ${var} -> ${tag}@${digest}"
done
