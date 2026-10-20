-- Tracks how far an unactioned case has been escalated by CaseEscalationService.
-- 0 = not escalated, 1 = district admin alerted, 2 = system admins alerted too.
ALTER TABLE cases ADD COLUMN escalation_level INT NOT NULL DEFAULT 0;
ALTER TABLE cases ADD COLUMN escalated_at TIMESTAMP NULL;
CREATE INDEX idx_cases_escalation ON cases (status, escalation_level, created_at);
