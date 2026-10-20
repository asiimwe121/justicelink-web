# lcdjp: review fixes and refactor

Nothing here was run with Maven (no access to Maven Central where this was prepared). Run `mvn verify` first.

## Package layout (`src/main/java/lcdjp/`)
`security` (config, JWT, cookies, sessions, crypto), `auth` (login, registration, password flows),
`user`, `admin`, `verification`, `cases`, `chat`, `legal`, `ai`, `translation`, `notification`,
`storage`, `maps`, `common` (rate limiting, caching, outbound HTTP, error handling). Only `LcdjpApplication` is in the root.
Tests sit in the same package as the class they test.

## Security
- `/api/**` paths ending in .js/.css/.html no longer skip authentication (SecurityConfig + JwtAuthenticationFilter share `isStaticAssetPath`).
- Content-Security-Policy added: frame-ancestors 'none'; base-uri 'self'; object-src 'none'. script-src still to do (innerHTML cleanup first).
- docker-compose: MySQL healthcheck reads the password from the container env (MYSQL_PWD), not the command line.
- Admin user updates only accept a whitelist of columns and no longer log parameter values.

## Error handling
- `ApiErrors` helper: unexpected failures are logged with a reference id and answered 500 (was 400 and silent) in NotificationController, ActivityController, VerificationController.

## SQL moved out of controllers (no controller uses JdbcTemplate now)
UserAccountRepository, MapLocationRepository, DistrictAdminRepository, LegalAlertRepository (new alert id from generated keys),
ChatRepository, AuthNotificationRepository, AccountSecurityRepository, DocumentRepository, AuthRepository,
RegistrationRepository, AdminUserRepository. `SessionIdentity.role` now takes a lookup function.

## Other
- `spring.main.allow-circular-references=false` (a static scan found no cycles). If the app fails to start with a
  circular-dependency error, set it back to true and the error names the cycle to fix.
- Hikari `minimum-idle=5` in the docker profile.
- `ArchitectureRulesTest` fails the build if a controller gets a JdbcTemplate/DataSource field again.
- Testcontainers + `MysqlMigrationsTest` (skipped when Docker is unavailable); new repository, helper and ChatController tests.
- The seven classes that lived inside AiController.java / AiIntakeController.java have their own files.

## Round 2 (still not run with Maven: Maven Central is blocked in the build environment)
- `GET /api/auth/notifications/admin/chat` inserted a notification; it is now `POST` with a JSON body `{message}`, and the sender
  comes from the session instead of a query parameter (it used to trust `username=`). `config.js` exposes it as
  `postAdminChatNotification`; nothing in the front end called the old helper.
- Front-end XSS pass (`static/*.js`): ~125 data interpolations inside HTML templates are now wrapped in `escapeHtml`
  (found with a JS parser, not a regex), the case dossier consts in `citizen.js` are escaped once at definition,
  and inline handlers no longer build JS strings from data: `onclick="f('${x}')"` became `f(${escapeHtml(JSON.stringify(String(x)))})`
  (also the notification-open handlers, which could be broken out of with a literal `&quot;`).
  Remaining: handlers built by string concatenation (`'...' + x + '...'`) and `script-src` in the CSP (needs the inline
  handlers/scripts moved out first).
- New settings, all defaulting to the previous behaviour:
  - `TRUSTED_PROXY_HOPS` (`app.trusted-proxy-hops`, default 0 = legacy). With `app.trust-proxy-headers=true` and a value N>=1 the
    client IP is the X-Forwarded-For entry N from the right (1 = one proxy, 2 = Cloudflare + proxy), which clients cannot forge.
    One shared `common/ClientIp` is used by the rate-limit filter, the rate-limit aspect and the audit log
    (the audit log used to believe X-Forwarded-For even when proxy headers were not trusted).
  - `PASSWORD_MIN_LENGTH` (default 8, can only be raised) via `security/PasswordPolicy`, used by the four places that had a literal 8.
  - `JWT_EXPIRATION_MS` (default 24 h) and `JWT_REMEMBER_ME_EXPIRATION_MS` (default 30 days); values under 1 minute are ignored.
  - All four are passed through `docker-compose.yml`.
- New tests: `ClientIpTest`, `PasswordPolicyTest`.

## Emails
- Every outgoing email is wrapped by `notification/EmailTemplate` (logo header, content card, footer) from `EmailService`; the logo is
  `static/images/justicelink-email-logo.png`, loaded from `app.base-url` (so that must be the public https address). Test: `EmailTemplateTest`.
- The "J" shown next to emails in an inbox is the client's sender avatar, not email content: see the reply for how to replace it.

## Contact Support bot (`static/supportHelp.js` + `supportHelp.css`)
- Every "Contact Support" button still opens the same window, but it now starts with a **help assistant** (a conversation, not a form): it asks
  what is wrong (tap a topic or type it), suggests what usually fixes it with buttons that jump into the app (Open My Cases, Alerts, Report,
  Emergency help, reload), asks "Did that solve it?", and if not tries a second round of checks. Only if the person is still stuck does it offer
  to hand them over to **customer care**.
- Handover: the bot sends the first live-chat message for them (`[Customer care request] <topic> | From: name (role, @user) | Bot suggested the
  fixes... | Details: ...`), so customer care starts with context. Customer care is still the existing support chat (messages go to admins).
- Rules: free text is matched to topics by keywords; unmatched twice -> offers handover; asking for "a human / customer care" the first time gets one
  quick attempt to fix it, the second time offers handover; danger words (kill, attack, abuse...) show 999 / 112 immediately; people who already
  started a conversation in the last 24 h get a "Continue with customer care" chip. Role-aware (citizen / lawyer topics). Administrators skip the bot.
- No AI service is used (rule based), so it works offline from the server. All wording and keywords are in the `TOPICS` list at the top of
  `supportHelp.js`. Wraps `window.toggleChat`; the chat code itself is unchanged. Service worker cache version bumped (`justicelink-supporthelp01`).
- Checked in headless Chromium with the real chat markup (topic path, free text, unmatched, human request, emergency, role topics, resume, admin
  skip); not checked against a running backend.

## OTP paste
- Registration code boxes: pasting (or SMS/email autofill) spreads the whole code across the boxes from the first one, clears leftovers, and the
  boxes no longer have maxlength=1 (it cut autofilled codes). Single-line 6-digit fields (login code, forgot-password code, verification
  dialogs): a global paste handler in `utils.js` keeps only the digits, so "123 456" or "123-456" now paste correctly.

## Date picker (`static/datePicker.js` + `datePicker.css`)
- Date of birth (`#reg_dob`, registration) and the admin edit dialog (`#ae_dob`) use a new picker: text field `yyyy-mm-dd` with a calendar
  button; the popup shows a day grid, and tapping the "Nov 1998" title switches to Month / Year lists with a check on the selected value
  and a blue (#1a4080) Apply button. Typing works (digits auto-format), keyboard navigation works (arrows, PageUp/PageDown, Esc), future dates and
  years older than 120 are disabled, and dark mode is supported.
- The input keeps its id and always holds `yyyy-mm-dd`, so `registration.js` validation is unchanged. Add `data-datepicker` to any other
  `<input type="date">` to use it (`data-min-year`, `data-max` are optional). Without JS it stays a native date input.
- Service worker cache version bumped (`justicelink-datepicker01`) and the two new files added to its list.
- Checked in headless Chromium at 480 px and 360 px wide (open/close, month+year choice, typing, keyboard); not tested on real phones.

## Not done
APP_BIND_ADDRESS default (still 0.0.0.0: flipping it blind would take the site down if your proxy is on another host),
AuthController still keys lockouts/rate limits on `getRemoteAddr()` (the proxy address when behind a proxy; switch it to
`ClientIp` once a build can run its tests), file streaming, Map rows -> typed records, splitting the largest controllers,
raising the JaCoCo floor (measure first), CSP `script-src`.

## Round 3 (audit fixes; not compiled, Maven Central unreachable where this was prepared: run `mvn verify`)
- Login, login-OTP, resend-OTP, login-alert email and reset-link validate/confirm now use `ClientIp.resolve` (was `getRemoteAddr()`, i.e. the proxy
  address, so all users shared one 10/min login bucket). Needs `app.trust-proxy-headers=true` (already set in the docker profile) and `TRUSTED_PROXY_HOPS`.
- `CacheConfig` implements `CachingConfigurer` with a `CacheErrorHandler`: a Redis failure on a cached call falls through to MySQL instead of a 500. Test: `CacheErrorHandlerTest`.
- docker profile: Hikari max pool 5 -> 20 (`DB_POOL_MAX_SIZE`), `server.tomcat.threads.max` 100, `accept-count` 50.
- `.github/workflows/ci.yml` (mvn verify + node checks + compose validation + image build if a Dockerfile exists) and `scripts/check-frontend.mjs` (node --check + dead onclick detection).
- ~1 MB of Uganda location tables moved from `notifications.js` to `uganda-geo.js` (loaded with `defer`, in the service worker list, cache version bumped to `justicelink-geosplit01`).
- `MapController`: four empty `catch (Exception e) {}` blocks replaced by `firstNumber(...)`, which logs a wrong-typed value.

## Round 3b: caching
- Case endpoints evict only the 'cases' and 'admin-verification' statistics keys (was `allEntries=true`, which also dropped 'districtAdmins');
  verification decisions evict only 'admin-verification'. All four `@Cacheable` statistics methods use `sync = true` (one rebuild per expired key).
- `CacheService` (monitoring only, per-JVM) is bounded at 10,000 entries. Tests: `CacheServiceTest`.
- Checked and left alone: `TokenBlacklistService.evictExpired` must run on every instance (it trims that instance's local fallback map), and
  `LoginOtpService` uses `CallerRunsPolicy` on purpose so a login code is never dropped.

## Round 3c: durable email outbox (V11)
- New table `email_outbox` (`V11__email_outbox.sql`, plain SQL for MySQL and H2). `NotificationDispatcher.sendEmail` writes the email there first, then sends it on the
  pool as before and marks the row SENT. A full queue, a provider failure or a restart no longer loses it: `EmailOutboxDrainer` (every 60 s, `app.outbox.drain-interval-ms`)
  retries PENDING rows with backoff 1/2/4/8/16/32 min (max 6 attempts, then FAILED) and purges SENT rows after 3 days and FAILED after 30 (`app.outbox.purge-cron`).
- Rows are claimed one at a time by an UPDATE, so several replicas never send the same row at once and Redis is not needed. If the outbox write itself fails, the email is sent
  in memory exactly as before. OTP and password-reset emails still bypass this on purpose (the user must be told if they fail).
- Stored bodies contain names and the login-alert IP, never codes or links. Tests: `EmailOutboxTest`. Run `mvn verify` (the Testcontainers migration test also checks V11 on MySQL).
- Migration README: next free number is now V12.

## Round 3d: Docker
- `docker-compose.yml` (checked with `docker compose config`): memory limits for mysql / redis / app (`MYSQL_MEM_LIMIT`, `REDIS_MEM_LIMIT`, `APP_MEM_LIMIT`, `APP_CPUS`),
  Redis `--maxmemory ${REDIS_MAXMEMORY:-256mb} --maxmemory-policy volatile-lru` (every key the app writes has a TTL), JVM `MaxRAMPercentage=70` + `ExitOnOutOfMemoryError`
  (the restart policy replaces a dead JVM), and a `mysql-backup` service (gzip dump every 24 h into `./backups`, newest 14 kept, failed dumps never replace good ones).
- New: `scripts/deploy.sh` (tagged build, wait for healthy, automatic return to the previous tag, `rollback`), `scripts/restore-db.sh`, `.dockerignore`, `.env.example`.
- `Dockerfile.example` was replaced by the real `Dockerfile` in round 3 (see below). CI builds `Dockerfile` when one exists.
- Not changed: `APP_BIND_ADDRESS` still defaults to 0.0.0.0 (flipping it blind would take the site down if your proxy is on another machine). Set `APP_BIND_ADDRESS=127.0.0.1`
  and `TRUSTED_PROXY_HOPS` in `.env` when nginx/Caddy runs on the same host. Copy `./backups` off the host too.

## Round 3e: maintainability
- Controllers split with no URL change (a mechanical move, so behaviour is identical; tests moved with the code):
  `AdminUserController` 985 -> 815 lines + new `AdminUserVerificationController` (verify approve/reject, verification-status GET/PUT);
  `AuthController` 884 -> 737 lines + new `AuthAdminOpsController` (audit-logs, health, test-email, test-endpoints, admin/status).
  `AuthControllerOtpAndAdminStatusTest` became `AuthAdminOpsControllerTest`; the verification tests moved to `AdminUserVerificationControllerTest`.
- Swallowed exceptions now logged (and unchanged in behaviour): `CaseAccessService` (previous-handler checks fail closed), `AuthNotificationController` role lookups,
  `AdminUserController.databaseText`, `DocumentController.getLong`.
- `ObjectStorageService` calls go through `OutboundGuard.withRetries` (retries 5xx/429/408, circuit breaker, a wrong status such as 404 still returns to the caller). Test: `ObjectStorageResilienceTest`.
  (`AfricasTalkingSmsService` already had a circuit breaker; my first audit was wrong about that.)
- JaCoCo: stale comment replaced; `scripts/jacoco-summary.py` prints the measured coverage and a suggested floor in CI. The floor stays 0.20 until CI shows the real number: it
  cannot be measured without running the suite.
- Still open, deliberately: the other big controllers (`RegistrationController`, `CaseController`), `Map<String,Object>` -> typed records, 22 services using JdbcTemplate directly
  (the architecture rule only covers controllers), 682 inline `onclick` handlers (needed before a CSP `script-src`).

## Dockerfile (round 3)
- `Dockerfile` is now part of the zip (it replaces `Dockerfile.example`). Changes against the one on the server: exec-form ENTRYPOINT (java is PID 1, no `sh -c`),
  heap flags via `JAVA_TOOL_OPTIONS` (what docker-compose.yml already sets, so no second `JAVA_OPTS` variable), the jar copied to a fixed name instead of a `*.jar` glob,
  `--chown` on the jar copy (no duplicate `chown -R` layer), `/app/static` created (application.properties lists `file:/app/static/`),
  BuildKit cache mount for `~/.m2`, quiet non-interactive Maven (`-ntp -q`), and `clean` dropped (the build stage starts empty anyway).
- docker-compose.yml now passes `DB_POOL_MAX_SIZE`, `TOMCAT_MAX_THREADS` and `SYSTEM_ADMIN_INITIAL_PASSWORD`; `.env.example` listed them but the app never received them.
- Not built here: no Docker or Maven Central in the sandbox. Run `docker compose build lcdjp-app` once; the cache mount needs BuildKit (default in Docker 23+ / compose v2).
- docker-compose.yml: the app container drops all Linux capabilities and sets `no-new-privileges` (MySQL and Redis are left alone: their entrypoints switch user and need the defaults).

## Round 4
- `LegalKnowledgeRetrievalService`: rebuilding the vector index reads only `id` and `embedding` (projection `findIdAndEmbedding`), not every chunk's full text, so the rebuild no longer spikes the heap inside a 1 GB container. `LegalKnowledgeRetrievalServiceTest` updated to match. Not compiled against the dependencies (no Maven Central here): run `mvn test`.
- `scripts/deploy.sh` preflight: refuses to deploy when `.env` is missing, a required secret is empty, or `JWT_SECRET` is under 32 characters; warns when `APP_BIND_ADDRESS` is not 127.0.0.1.
- `.github/dependabot.yml` (Maven, Docker, Actions, weekly) and a Trivy image scan in CI (fails on fixable HIGH/CRITICAL). If the scan blocks a merge over a base-image issue, bump `JRE_IMAGE` rather than disabling it.

## Round 5 (security, errors, rate limits, performance, testing, maintainability review)
- New tests: `RequestSizeLimitFilterTest` (declared oversize, within limit, undeclared/chunked body cut off mid-read) and `CaseAccessServiceTest`
  (who may open a case: owner, other citizen, admin, assigned lawyer/handler, previous handler, fail-closed on database error). Not run: no Maven Central here.
- `scripts/smoke.sh`: post-deploy checks (health, home page, API needs login, admin API and metrics not public, bad login rejected, CSP and nosniff headers).
  `scripts/deploy.sh` runs it after the health check and treats a failure like an unhealthy deploy (restarts the previous tag).
- Review finding, not changed: `RoleAuthority.isAdministratorRole` includes DISTRICT_ADMIN, so `CaseAccessService.canAccessCase` lets a district admin open cases in any district.
  If that is not intended, add a district check for DISTRICT_ADMIN there.
- Review finding, not changed: `app.rate-limit.global-per-ip-per-minute` defaults to 0 (off). Many mobile users can share one carrier IP, so pick a value from real traffic before enabling.
