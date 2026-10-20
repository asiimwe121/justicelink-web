-- Durable queue for best-effort emails (login alert, welcome, approval). A row is written before the send is
-- attempted, so an email is no longer lost when the in-memory queue is full or the app restarts; a scheduled job
-- retries rows that are still PENDING. Plain SQL that MySQL and H2 both accept.
CREATE TABLE IF NOT EXISTS email_outbox (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    to_address      VARCHAR(320) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    body            MEDIUMTEXT NOT NULL,
    status          VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    attempts        INT NOT NULL DEFAULT 0,
    last_error      VARCHAR(500) NULL,
    next_attempt_at TIMESTAMP NOT NULL,
    created_at      TIMESTAMP NOT NULL,
    sent_at         TIMESTAMP NULL
);

CREATE INDEX idx_email_outbox_due ON email_outbox (status, next_attempt_at);
