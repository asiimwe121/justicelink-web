# Database migrations

Flyway runs the `V<n>__*.sql` files in this folder in version order, once each, at startup.

## Rules

1. **Never edit a migration that has been deployed.** Flyway stores a checksum of every applied file and
   (with `validate-on-migrate=true`, the default) refuses to start if it changed. Fix forward with a new file.
2. **New migrations take the next number above the highest one that exists** (today: `V13`). Do not
   backfill a lower number, even if your branch was cut earlier; renumber when you merge.
3. **`V6` is intentionally absent.** Numbers are not required to be contiguous. Do not add a `V6`:
   with `out-of-order=false` Flyway would reject it on every database that is already past it.
   `MigrationFilesTest` enforces rules 2 and 3.
4. Prefer `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN` guarded changes only where a migration may run on a
   database that already has the object (`V1` does this because it was written after the tables existed).

## Settings (environment variables)

| Variable | Default | Use |
|---|---|---|
| `FLYWAY_VALIDATE_ON_MIGRATE` | `true` | Set `false` only as a short-lived escape hatch while fixing a checksum mismatch. Prefer `flyway repair` once you know the file on disk is the intended one. |
| `FLYWAY_OUT_OF_ORDER` | `false` | Leave off. Turning it on lets a late low-numbered migration run in production but in a different order than in dev and CI. |
| `FLYWAY_BASELINE_ON_MIGRATE` | `false` | Set `true` once, for a database that has tables but no `flyway_schema_history`. |

## Before the first deploy with strict settings

Run this against every real database (production, staging) and compare with the files here:

```sql
SELECT installed_rank, version, description, checksum, success
FROM flyway_schema_history ORDER BY installed_rank;
```

* Every version listed should have a file here with the same description, and `success = 1`.
* If a **version 6** row exists, the old file was removed from the source: restore it under its
  original name (the checksum must match) rather than deploying without it.
* If the table does not exist, the database was never baselined: set `FLYWAY_BASELINE_ON_MIGRATE=true`
  for that first start, then remove it.
* If the app fails to start with a checksum or "resolved but not applied" message, the message names the
  migration. Do not switch validation off to get past it; find out why it differs.

## Known history

* **V1-V4 were edited after they had been applied** on the production server, so Flyway refused to start
  (`Migration checksum mismatch`). On 2026-10-10 the stored checksums were realigned with
  `scripts/fix-flyway-checksums.sh` after `scripts/flyway-drift-check.sql` showed the live schema matched what the
  files create. That script also created two tables the older V1 did not have (`contact_requests`,
  `legal_aid_organizations`). Do not edit these files again; add a new migration.
* **V1 defects that only show on a brand-new database** (production is unaffected because V1 never re-runs there),
  to be fixed forward in a new migration, not by editing V1:
  * `routing_choice` and `declined_lawyers` are declared on `users`, but the application uses them on `cases`.
  * `idx_cases_routing_lookup` spans five wide `VARCHAR` columns and exceeds MySQL's 3072-byte index limit
    under `utf8mb4`, so V1 is likely to fail on an empty database.
