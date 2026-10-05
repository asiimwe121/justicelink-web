CREATE TABLE IF NOT EXISTS session_revocations (
    username VARCHAR(255) NOT NULL PRIMARY KEY,
    revoked_at_ms BIGINT NOT NULL
);
