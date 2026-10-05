# JusticeLink operations guide

## Switching on real SMS (Africa's Talking)

1. Create an Africa's Talking account, get your **username** and an **API key**. Start with the sandbox
   (`AT_SANDBOX=true`, username `sandbox`) to test without sending real texts.
2. For live sending, apply for a **sender ID** (optional; without it AT uses a shared one).
3. Add to the environment of the `lcdjp-backend` service (docker-compose `environment:` or `.env`):

   ```
   SMS_PROVIDER=africastalking
   AT_USERNAME=<your username>
   AT_API_KEY=<your api key>
   AT_SENDER_ID=JUSTICELINK        # optional
   AT_SANDBOX=false
   ```
4. Restart the backend. With the provider on but no username/key the app **refuses to start**, so a
   missing key is caught immediately instead of on the first login code.
5. With `SMS_PROVIDER` unset (or `logging`) texts are only written to the server log. Never run production like that.

## Backups

| What | Script | When |
|---|---|---|
| Database dump (gzip, integrity-checked, 14 days kept) | `ops/backup-db.sh` | every night |
| Proof the backup restores into a scratch database | `ops/restore-test.sh` | monthly, and after schema changes |

* Copy `ops/` to the server (for example `/opt/justicelink/ops`) and install the cron lines from `ops/crontab.example`.
* Set `BACKUP_REMOTE` (an rclone remote such as an S3/Backblaze bucket) so a copy lives **off the server**.
* Set `HEALTHCHECK_PING_URL` (a free healthchecks.io check) so you are told when a backup does **not** run.
* Uploaded documents and photos live in the database in this app, so the dump covers them. If that changes, back up the new storage too.
* Decide and write down: how much data you can afford to lose (nightly = up to 24 h) and how long a restore may take.
  Run `restore-test.sh` once by hand and time it; that number is your honest recovery time.

## Uptime monitoring

* Simplest: a hosted checker (UptimeRobot, Better Stack, Healthchecks.io) watching
  `https://justicelinkug.org/actuator/health` for HTTP 200 and the word `UP`. Most give you a public status page.
* Self-hosted: run `ops/healthcheck.sh` every minute from **another machine** (see `ops/crontab.example`) with `ALERT_WEBHOOK` set.
* Alert someone who will actually read it at night, and test the alert once.

## Sessions after a password reset

Completing a password reset (emailed code or admin-sent link) ends every session that was open before it.
The reset marks the user in `session_revocations`; tokens issued at or before that moment are refused,
and `/api/auth/refresh` will not exchange them. Changing your own password while logged in does not do this.

## Files that must never be public

Everything in `src/main/resources/static` is downloadable by anyone. `StaticResourcesSafetyTest` fails the
build if configuration, SQL, source or notes land there. Developer notes live in `docs/`. Where configuration lives, and how to rotate secrets, is in `docs/SECRETS.md`.
