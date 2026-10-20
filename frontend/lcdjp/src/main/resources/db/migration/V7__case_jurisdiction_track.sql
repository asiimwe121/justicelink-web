-- Which kind of institution a report belongs with, decided by JurisdictionRouting rules (not by the AI).
-- NULL means "not assessed" (cases created before this migration) and stays visible in the LC queue as before.
ALTER TABLE cases ADD COLUMN jurisdiction_track VARCHAR(32) NULL;
ALTER TABLE cases ADD COLUMN jurisdiction_urgent BOOLEAN NOT NULL DEFAULT FALSE;
-- Whitelisted extra fields for land and detention reports (stored as a small JSON object).
ALTER TABLE cases ADD COLUMN case_details TEXT NULL;
CREATE INDEX idx_cases_jurisdiction ON cases (jurisdiction_track, jurisdiction_urgent);
