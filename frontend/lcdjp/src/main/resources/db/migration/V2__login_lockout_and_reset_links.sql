CREATE TABLE IF NOT EXISTS login_lockouts (
    username VARCHAR(255) NOT NULL PRIMARY KEY,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    last_failed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS password_reset_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL
);

CREATE INDEX idx_password_reset_links_username ON password_reset_links (username);
