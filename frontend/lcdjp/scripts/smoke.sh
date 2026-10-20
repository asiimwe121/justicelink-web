#!/usr/bin/env bash
# Post-deploy smoke test: a handful of checks that the running app serves pages and still enforces its security rules.
#   scripts/smoke.sh [base-url]      default http://127.0.0.1:8080  (use https://justicelinkug.org to test through the proxy)
# Exit code 0 = all passed. Needs curl; skips (exit 0) with a notice when curl is missing.
set -uo pipefail
BASE="${1:-http://127.0.0.1:8080}"
command -v curl >/dev/null 2>&1 || { echo "smoke: curl not installed, skipping"; exit 0; }

fail=0
check() {  # check <description> <expected status regex> <curl args...>
  local desc="$1" want="$2"; shift 2
  local got
  got=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$@" 2>/dev/null || true)
  if [[ "$got" =~ ^($want)$ ]]; then
    echo "ok    $desc ($got)"
  else
    echo "FAIL  $desc: got ${got:-no response}, wanted $want"; fail=1
  fi
}

check "health endpoint"                     "200"     "$BASE/actuator/health"
check "home page"                           "200"     "$BASE/"
check "cases need a login"                  "401|403" "$BASE/api/cases"
check "admin API needs a login"             "401|403" "$BASE/api/admin/users"
check "metrics are not public"              "401|403" "$BASE/actuator/prometheus"
check "login rejects a bad password"        "400|401|403|429" -X POST -H 'Content-Type: application/json' \
      -H 'X-Requested-With: smoke' -d '{"username":"smoke-test-nobody","password":"wrong-password-1"}' "$BASE/api/auth/login"

hdrs=$(curl -s -I -m 15 "$BASE/" 2>/dev/null || true)
if grep -qi '^content-security-policy:' <<<"$hdrs"; then echo "ok    CSP header present"; else echo "FAIL  CSP header missing"; fail=1; fi
if grep -qi '^x-content-type-options:' <<<"$hdrs"; then echo "ok    nosniff header present"; else echo "FAIL  X-Content-Type-Options header missing"; fail=1; fi

(( fail == 0 )) && echo "smoke: all checks passed" || echo "smoke: FAILED"
exit $fail
