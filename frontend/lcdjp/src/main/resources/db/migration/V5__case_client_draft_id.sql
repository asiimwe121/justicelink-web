-- Idempotency key for cases drafted offline and synced later.
-- A retried sync (for example after a dropped connection) must never create a second case.
ALTER TABLE cases ADD COLUMN client_draft_id VARCHAR(64) NULL;
CREATE UNIQUE INDEX uq_cases_citizen_client_draft ON cases (citizen_id, client_draft_id);
